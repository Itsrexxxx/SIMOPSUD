from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.aircraft import AircraftUnit
from app.models.airbase import AirBase
from app.models.scenario import OperationsScenario
from app.services.predictive_model import SupervisedLearningEngine

class SimulationEngine:
    def __init__(
        self, 
        db: Session,
        avtur_rate_per_hour: float = 2500.0, # Liter per jam per pesawat (dapat disesuaikan)
        lube_rate_per_hour: float = 5.0,     # Liter per jam per pesawat
        max_safe_flight_hours: float = 300.0, # Batas aman jam terbang sebelum grounding
        truck_to_aircraft_ratio: int = 4,    # 1 truk refueler dapat melayani 4 pesawat
        forklift_to_aircraft_ratio: int = 6  # 1 forklift dapat melayani 6 pesawat
    ):
        self.db = db
        self.avtur_rate_per_hour = avtur_rate_per_hour
        self.lube_rate_per_hour = lube_rate_per_hour
        self.max_safe_flight_hours = max_safe_flight_hours
        self.truck_to_aircraft_ratio = truck_to_aircraft_ratio
        self.forklift_to_aircraft_ratio = forklift_to_aircraft_ratio
        self.ai_engine = SupervisedLearningEngine()

    def calculate_consumption(self, flight_hours_per_aircraft: float, num_aircraft: int) -> Dict[str, float]:
        """
        1. Menghitung total konsumsi avtur & pelumas harian berdasarkan jam terbang pesawat yang dikerahkan.
        """
        total_hours = flight_hours_per_aircraft * num_aircraft
        return {
            "total_flight_hours": total_hours,
            "avtur_consumed_liters": total_hours * self.avtur_rate_per_hour,
            "lube_consumed_liters": total_hours * self.lube_rate_per_hour
        }

    def check_bottleneck(self, deployed_aircraft_count: int, airbase: AirBase) -> Dict[str, Any]:
        """
        2. Melakukan pengecekan Bottleneck (membandingkan rasio pengerahan pesawat dengan ketersediaan truk dan forklift).
        """
        required_trucks = (deployed_aircraft_count + self.truck_to_aircraft_ratio - 1) // self.truck_to_aircraft_ratio
        required_forklifts = (deployed_aircraft_count + self.forklift_to_aircraft_ratio - 1) // self.forklift_to_aircraft_ratio
        
        truck_bottleneck = required_trucks > airbase.refueler_trucks_count
        forklift_bottleneck = required_forklifts > airbase.forklifts_count
        apron_bottleneck = deployed_aircraft_count > airbase.apron_capacity

        return {
            "deployed_aircraft": deployed_aircraft_count,
            "airbase_name": airbase.name,
            "required_trucks": required_trucks,
            "available_trucks": airbase.refueler_trucks_count,
            "truck_bottleneck": truck_bottleneck,
            "required_forklifts": required_forklifts,
            "available_forklifts": airbase.forklifts_count,
            "forklift_bottleneck": forklift_bottleneck,
            "apron_bottleneck": apron_bottleneck,
            "is_bottleneck": truck_bottleneck or forklift_bottleneck or apron_bottleneck
        }

    def run_maintenance_trigger(self, aircraft_units: List[AircraftUnit]) -> List[AircraftUnit]:
        """
        3. Menjalankan Maintenance Trigger (jika akumulasi jam terbang melewati batas aman, ubah status).
        """
        grounded_aircraft = []
        for unit in aircraft_units:
            if unit.accumulated_flight_hours >= self.max_safe_flight_hours:
                if unit.status != "U/S":
                    unit.status = "U/S"
                    grounded_aircraft.append(unit)
                    
        if grounded_aircraft:
            self.db.commit()
            
        return grounded_aircraft
        
    def run_daily_simulation(self, scenario_id: int, airbase_id: int, daily_flight_hours_per_aircraft: float) -> Dict[str, Any]:
        """
        Fungsi utama untuk menjalankan simulasi harian.
        Menggabungkan ketiga logika: konsumsi, bottleneck, dan maintenance trigger.
        """
        scenario = self.db.query(OperationsScenario).filter(OperationsScenario.id == scenario_id).first()
        airbase = self.db.query(AirBase).filter(AirBase.id == airbase_id).first()
        
        if not scenario or not airbase:
            raise ValueError("Scenario atau Airbase tidak ditemukan")
            
        # Dapatkan list pesawat yang dikerahkan di skenario ini
        aircraft_units = [deployment.aircraft for deployment in scenario.deployments]
        num_aircraft = len(aircraft_units)
        
        # 1. Hitung konsumsi bahan bakar dan pelumas
        consumption = self.calculate_consumption(daily_flight_hours_per_aircraft, num_aircraft)
        
        # 2. Cek bottleneck infrastruktur dan dukungan ground
        bottlenecks = self.check_bottleneck(num_aircraft, airbase)
        
        # Update akumulasi jam terbang untuk simulasi hari ini
        for unit in aircraft_units:
            unit.accumulated_flight_hours += daily_flight_hours_per_aircraft
            
        # 3. Jalankan trigger pemeliharaan
        grounded = self.run_maintenance_trigger(aircraft_units)
        
        # 4. Supervised Learning: Analisa Prediktif & Mitigasi
        avg_flight_hours = sum(a.accumulated_flight_hours for a in aircraft_units) / num_aircraft if num_aircraft > 0 else 0
        ai_analysis = self.ai_engine.predict_bottleneck(
            flight_hours=avg_flight_hours,
            available_trucks=airbase.refueler_trucks_count,
            available_forklifts=airbase.forklifts_count,
            deployed_aircraft=num_aircraft
        )
        
        # Simpan perubahan (penambahan jam terbang) ke database
        self.db.commit()
        
        return {
            "scenario": scenario.name,
            "date_of_simulation": "Simulasi Harian",
            "consumption": consumption,
            "bottlenecks": bottlenecks,
            "ai_analysis": ai_analysis,
            "newly_grounded_aircraft": [
                {"id": a.id, "tail_number": a.tail_number, "hours": a.accumulated_flight_hours} 
                for a in grounded
            ]
        }
