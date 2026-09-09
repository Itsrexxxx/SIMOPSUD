import pathlib, warnings
warnings.filterwarnings('ignore')
import numpy as np, pandas as pd
from sklearn.model_selection import train_test_split, KFold, cross_validate, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, classification_report
import joblib, shutil

DATA = pathlib.Path(__file__).parent / "data"
RANDOM_STATE = 42

dim_ab = pd.read_csv(DATA / "dim_airbase.csv")
df = pd.read_csv(DATA / "flight_missions_train.csv")
bn = pd.read_csv(DATA / "bottleneck_train.csv")

# enrich (same as notebook cell 11)
ab_map = dim_ab.set_index("code")["runway_m"].to_dict()
df["dest_runway_m"] = df["dest_code"].map(ab_map)
df["origin_runway_m"] = df["origin_code"].map(ab_map)
df["min_runway_map"] = df["type_key"].map({"f-16":1800,"sukhoi":1800,"t-50i":1400,"c-130":1600,"boeing":2000,"tucano":900})
df["runway_ratio"] = df["dest_runway_m"] / df["min_runway_map"]
df["hour_sin"] = np.sin(2*np.pi*df["hour"]/24)
df["hour_cos"] = np.cos(2*np.pi*df["hour"]/24)
df["month_sin"] = np.sin(2*np.pi*df["month"]/12)
df["month_cos"] = np.cos(2*np.pi*df["month"]/12)
df["is_wet"] = df["month"].isin([11,12,1,2,3]).astype(int)
df["is_afternoon"] = ((df["hour"]>=13)&(df["hour"]<=18)).astype(int)
df["is_intra_kodau"] = (df["origin_kodau"]==df["dest_kodau"]).astype(int)
df["is_critical"] = ((df["origin_code"].isin(["TAR","HHD"])) | (df["dest_code"].isin(["TAR","HHD"]))).astype(int)
# ground_speed from effective cruise (extend) else fallback
cruise_col = "cruise_effective_kmh" if "cruise_effective_kmh" in df.columns else "cruise_speed_kmh"
df["ground_speed"] = (df[cruise_col] - 0.35*df["avg_wind_kmh"]).clip(lower=df[cruise_col]*0.82)

CORE = ["distance_km","cruise_speed_kmh","avg_wind_kmh","weather_severity"]
FULL_NUM = CORE + ["taxi_min","ground_speed","runway_ratio","hour_sin","hour_cos","month_sin","month_cos","is_wet","is_afternoon","is_intra_kodau","is_critical","payload_ratio","flight_level","alternate_distance_km","origin_visibility_m","dest_visibility_m"]
FULL_CAT = ["type_key","origin_kodau","dest_kodau"]
TARGET="actual_duration_minutes"
for c in FULL_NUM:
    if c not in df.columns:
        raise SystemExit(f"missing col {c}")

X_full = df[FULL_NUM + FULL_CAT]
y = df[TARGET].values
Xtr_f, Xte_f, ytr_f, yte_f = train_test_split(X_full, y, test_size=0.2, random_state=RANDOM_STATE)

def mape(a,b): return float(np.mean(np.abs((a-b)/np.clip(np.abs(a),1e-6,None)))*100)
def scores(yt, yp): return dict(MAE=mean_absolute_error(yt,yp), RMSE=np.sqrt(mean_squared_error(yt,yp)), R2=r2_score(yt,yp), MAPE=mape(yt,yp))

# core model (4 fitur) — ini yang dipakai backend ETAPredictionEngine
core = HistGradientBoostingRegressor(random_state=RANDOM_STATE)
core.fit(df[CORE].values, y)
print("core fitted", scores(yte_f, core.predict(Xte_f[CORE].values)))

# full pipeline
pre = ColumnTransformer([("num", StandardScaler(), FULL_NUM), ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FULL_CAT)])
pipe_full = Pipeline([("pre", pre), ("m", HistGradientBoostingRegressor(random_state=RANDOM_STATE))])
pipe_full.fit(Xtr_f, ytr_f)
print("full HistGB", scores(yte_f, pipe_full.predict(Xte_f)))

# CV
kf=KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
res=cross_validate(HistGradientBoostingRegressor(random_state=RANDOM_STATE), df[CORE].values, y, cv=kf, scoring=["neg_mean_absolute_error","r2"], n_jobs=-1)
print(f"CV core MAE {(-res['test_neg_mean_absolute_error']).mean():.3f} +- {(-res['test_neg_mean_absolute_error']).std():.3f} R2 {res['test_r2'].mean():.4f}")
res2=cross_validate(pipe_full, X_full, y, cv=kf, scoring=["neg_mean_absolute_error","r2"], n_jobs=-1)
print(f"CV full MAE {(-res2['test_neg_mean_absolute_error']).mean():.3f} +- {(-res2['test_neg_mean_absolute_error']).std():.3f} R2 {res2['test_r2'].mean():.4f}")

# GridSearch best (full)
param_grid={"m__max_depth":[6,10,None], "m__learning_rate":[0.05,0.1], "m__max_iter":[200,400]}
grid=GridSearchCV(pipe_full, param_grid, cv=3, scoring="neg_mean_absolute_error", n_jobs=-1)
grid.fit(Xtr_f, ytr_f)
best=grid.best_estimator_
print("best", grid.best_params_, f"CV MAE {(-grid.best_score_):.3f}")
print("test best", scores(yte_f, best.predict(Xte_f)))

# delay classifier
df["is_delayed"]=(df["delay_minutes"]>5).astype(int)
from sklearn.pipeline import Pipeline as Pipe
Xd=df[FULL_NUM+FULL_CAT]; yd=df["is_delayed"].values
Xtrd,Xted,ytrd,yted=train_test_split(Xd,yd,test_size=0.2,random_state=RANDOM_STATE,stratify=yd)
clf=Pipe([("pre", ColumnTransformer([("num", StandardScaler(), FULL_NUM), ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), FULL_CAT)])), ("m", RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE, n_jobs=-1))])
clf.fit(Xtrd,ytrd)
print(classification_report(yted, clf.predict(Xted), digits=3))

# bottleneck
Fb=["avg_flight_hours","refueler_trucks","forklifts","deployed_aircraft"]
Xb,yb=bn[Fb].values, bn["is_critical"].values
Xtrb,Xteb,ytrb,yteb=train_test_split(Xb,yb,test_size=0.2,random_state=RANDOM_STATE,stratify=yb)
rfb=RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE, n_jobs=-1)
rfb.fit(Xtrb,ytrb)
print(classification_report(yteb, rfb.predict(Xteb), digits=3))

# export
joblib.dump(best, DATA/"eta_best.joblib", compress=3)
joblib.dump(clf, DATA/"delay_clf.joblib", compress=3)
joblib.dump(rfb, DATA/"bottleneck_rf.joblib", compress=3)
joblib.dump(core, DATA/"eta_core.joblib", compress=3)
print("saved", [str(p) for p in [DATA/"eta_best.joblib", DATA/"eta_core.joblib", DATA/"delay_clf.joblib", DATA/"bottleneck_rf.joblib"]])
for p in [DATA/"eta_best.joblib", DATA/"eta_core.joblib", DATA/"delay_clf.joblib", DATA/"bottleneck_rf.joblib"]:
    print(p.name, f"{p.stat().st_size/1024:.0f} KB")

# copy to backend _models
dst = pathlib.Path(__file__).parent.parent / "backend" / "backend" / "app" / "services" / "_models"
dst.mkdir(parents=True, exist_ok=True)
for f in ["eta_best.joblib","eta_core.joblib","bottleneck_rf.joblib"]:
    shutil.copy2(DATA/f, dst/f)
    print("copied", f, "->", dst/f, f"{(dst/f).stat().st_size/1024:.0f} KB")
