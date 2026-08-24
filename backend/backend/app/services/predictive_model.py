import numpy as np
from sklearn.ensemble import RandomForestClassifier

class SupervisedLearningEngine:
    def __init__(self):
        # Menginisiasi model Random Forest Classifier
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self._train_dummy_model()

    def _train_dummy_model(self):
        """
        Melakukan proses training model AI dengan dataset dummy historis.
        Fitur: [jam_terbang, jumlah_truk, jumlah_forklift, pesawat_dikerahkan]
        Target: 0 (Aman), 1 (Kritis / Bottleneck)
        """
        # Dataset dummy yang merepresentasikan historis operasi
        X_train = np.array([
            [100, 5, 2, 4],  # Aman
            [350, 1, 1, 4],  # Kritis (jam terbang tinggi, dukungan logistik rendah)
            [50,  10, 5, 2], # Aman
            [400, 2, 1, 8],  # Kritis 
            [200, 4, 3, 4],  # Aman
            [300, 2, 1, 5],  # Kritis
            [150, 6, 4, 3],  # Aman
            [320, 3, 2, 6],  # Kritis
            [280, 5, 3, 4],  # Aman
            [310, 2, 1, 6],  # Kritis
        ])
        
        y_train = np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
        
        # Proses Supervised Learning Training
        self.model.fit(X_train, y_train)

    def predict_bottleneck(self, flight_hours: float, available_trucks: int, available_forklifts: int, deployed_aircraft: int) -> dict:
        """
        Memprediksi probabilitas terjadinya hambatan (bottleneck) 
        serta memberikan rekomendasi Mitigasi Hambatan.
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
