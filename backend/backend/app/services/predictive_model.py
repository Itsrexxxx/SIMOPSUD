import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).resolve().parent / "_models"


class SupervisedLearningEngine:
    def __init__(self):
        self.model = None
        self.model_source = "dummy"
        self._load_or_train()

    def _load_or_train(self):
        p = _MODEL_DIR / "bottleneck_rf.joblib"
        if p.exists():
            try:
                self.model = joblib.load(p)
                self.model_source = "joblib:bottleneck_rf.joblib"
                logger.info("Bottleneck model loaded from %s", p)
                return
            except Exception as e:  # noqa: BLE001
                logger.warning("Gagal load %s: %s — fallback dummy", p, e)
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self._train_dummy_model()
        self.model_source = "dummy:10-row"

    def _train_dummy_model(self):
        """
        Fallback 10 baris. Dipakai hanya jika joblib tidak ada.
        Fitur: [jam_terbang, jumlah_truk, jumlah_forklift, pesawat_dikerahkan]
        Target: 0 (Aman), 1 (Kritis / Bottleneck)
        """
        X_train = np.array([
            [100, 5, 2, 4],
            [350, 1, 1, 4],
            [50,  10, 5, 2],
            [400, 2, 1, 8],
            [200, 4, 3, 4],
            [300, 2, 1, 5],
            [150, 6, 4, 3],
            [320, 3, 2, 6],
            [280, 5, 3, 4],
            [310, 2, 1, 6],
        ])
        y_train = np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
        self.model.fit(X_train, y_train)

    def predict_bottleneck(self, flight_hours: float, available_trucks: int, available_forklifts: int, deployed_aircraft: int) -> dict:
        """
        Memprediksi probabilitas terjadinya hambatan (bottleneck) 
        serta memberikan rekomendasi Mitigasi Hambatan.
        Model joblib dilatih dari notebooks/data/bottleneck_train.csv (800 baris Kodau I-III).
        """
        if deployed_aircraft <= 0:
            return {
                "probability_critical_percent": 0.0,
                "is_critical": False,
                "mitigations": ["Data pesawat belum tersedia, sehingga prediksi risiko belum dapat dilakukan."],
            }

        features = np.array([[flight_hours, available_trucks, available_forklifts, deployed_aircraft]])
        
        # Mendapatkan probabilitas kelas 1 (Kritis)
        probabilities = self.model.predict_proba(features)
        prob_critical = probabilities[0][1] * 100  # Konversi ke persentase
        
        is_critical = prob_critical > 50.0
        
        # Generate Rekomendasi Mitigasi Hambatan
        mitigations = []
        if is_critical:
            if available_trucks < (deployed_aircraft / 2):
                mitigations.append(f"Lakukan pergeseran minimal {(deployed_aircraft // 2) - available_trucks + 1} unit truk refueler dari pangkalan terdekat.")
            if flight_hours >= 280:
                mitigations.append("Percepat jadwal inspeksi (maintenance) pesawat untuk mencegah failure akibat jam terbang tinggi.")
            if available_forklifts < 2:
                mitigations.append("Siagakan forklift tambahan atau tenaga manual ekstra untuk loading/unloading amunisi.")
                
            if not mitigations:
                mitigations.append("Tingkatkan kewaspadaan komando dan siagakan mekanik cadangan di apron.")
        else:
            mitigations.append("Operasi dalam batas wajar, pertahankan rasio dukungan logistik dan jam terbang saat ini.")

        return {
            "probability_critical_percent": round(prob_critical, 2),
            "is_critical": bool(is_critical),
            "mitigations": mitigations
        }

    def get_feature_importance(self) -> dict:
        """Return model feature weights for transparent analysis in the thesis."""
        feature_names = [
            "Rata-rata jam terbang",
            "Jumlah truk refueler",
            "Jumlah forklift",
            "Jumlah pesawat ditempatkan",
        ]
        return {
            name: round(float(importance), 4)
            for name, importance in zip(feature_names, self.model.feature_importances_)
        }
