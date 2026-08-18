import io
from typing import Dict, Any
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

class PDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        
        # Gaya untuk Judul Utama
        self.title_style = self.styles['Heading1']
        self.title_style.alignment = 1  # 1 = Center
        
        # Gaya untuk Sub-Judul dan Paragraf Normal
        self.heading_style = self.styles['Heading2']
        self.normal_style = self.styles['Normal']
        
        # Gaya khusus untuk peringatan (alert) warna merah
        self.alert_style = ParagraphStyle(
            'Alert',
            parent=self.styles['Normal'],
            textColor=colors.red,
            fontName='Helvetica-Bold'
        )

    def generate_simulation_report(self, simulation_data: Dict[str, Any]) -> io.BytesIO:
        """
        Menghasilkan file Laporan PDF berstandar formal (menggunakan ukuran A4)
        berdasarkan hasil analisis dari Simulation Engine.
        Hasilnya dikembalikan dalam bentuk BytesIO stream agar bisa langsung diunduh lewat API.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch,
            title="Laporan Simulasi Operasi"
        )
        
        elements = []
        
        # ==========================================
        # 1. Header & Title Laporan
        # ==========================================
        title = Paragraph("LAPORAN ANALISA PREDIKTIF - APLIKASI SIMKO", self.title_style)
        elements.append(title)
        elements.append(Spacer(1, 0.25 * inch))
        
        # Detail Meta Skenario
        scenario_name = simulation_data.get("scenario", "Skenario Tidak Diketahui")
        date_sim = simulation_data.get("date_of_simulation", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        elements.append(Paragraph(f"<b>Skenario Pengerahan:</b> {scenario_name}", self.normal_style))
        elements.append(Paragraph(f"<b>Waktu Cetak Laporan:</b> {date_sim}", self.normal_style))
        elements.append(Spacer(1, 0.3 * inch))
        
        # ==========================================
        # 2. Ringkasan Konsumsi Logistik
        # ==========================================
        elements.append(Paragraph("1. Ringkasan Konsumsi Logistik", self.heading_style))
        elements.append(Spacer(1, 0.1 * inch))
        
        cons = simulation_data.get("consumption", {})
        cons_data = [
            ["Parameter Penilaian", "Total Estimasi"],
            ["Total Akumulasi Jam Terbang", f"{cons.get('total_flight_hours', 0):.2f} Jam"],
            ["Total Konsumsi Avtur", f"{cons.get('avtur_consumed_liters', 0):,.2f} Liter"],
            ["Total Pelumas Khusus", f"{cons.get('lube_consumed_liters', 0):,.2f} Liter"]
        ]
        
        cons_table = Table(cons_data, colWidths=[3.2*inch, 2.8*inch])
        cons_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')), # Header abu gelap
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecf0f1')), # Body abu terang
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(cons_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        # ==========================================
        # 3. Analisis Prediktif AI (Supervised Learning) & Titik Kritis
        # ==========================================
        elements.append(Paragraph("2. Analisis Prediktif & Titik Kritis (AI Supervised Learning)", self.heading_style))
        elements.append(Spacer(1, 0.1 * inch))
        
        ai_analysis = simulation_data.get("ai_analysis", {})
        prob_critical = ai_analysis.get("probability_critical_percent", 0.0)
        is_critical_ai = ai_analysis.get("is_critical", False)
        
        ai_status_text = f"TINGGI ({prob_critical}%)" if is_critical_ai else f"RENDAH ({prob_critical}%)"
        ai_status_style = self.alert_style if is_critical_ai else self.normal_style
        
        elements.append(Paragraph(f"<b>Probabilitas Terjadinya Hambatan (Bottleneck):</b> {ai_status_text}", ai_status_style))
        elements.append(Spacer(1, 0.1 * inch))
        
        # Detail infrastruktur
        bots = simulation_data.get("bottlenecks", {})
        bots_data = [
            ["Elemen Dukungan", "Dibutuhkan", "Tersedia", "Status Aktual"]
        ]
        
        t_req = bots.get('required_trucks', 0)
        t_avail = bots.get('available_trucks', 0)
        t_status = "KRITIS" if bots.get('truck_bottleneck') else "AMAN"
        bots_data.append(["Truk Refueler", str(t_req), str(t_avail), t_status])
        
        f_req = bots.get('required_forklifts', 0)
        f_avail = bots.get('available_forklifts', 0)
        f_status = "KRITIS" if bots.get('forklift_bottleneck') else "AMAN"
        bots_data.append(["Forklift (Alat Berat)", str(f_req), str(f_avail), f_status])
        
        bots_table = Table(bots_data, colWidths=[2.2*inch, 1*inch, 1*inch, 1.8*inch])
        bots_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2980b9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(bots_table)
        elements.append(Spacer(1, 0.2 * inch))
        
        # Rekomendasi Mitigasi
        elements.append(Paragraph("<b>Rekomendasi Mitigasi Hambatan:</b>", self.normal_style))
        mitigations = ai_analysis.get("mitigations", [])
        for mitigation in mitigations:
            elements.append(Paragraph(f"• {mitigation}", self.normal_style))
        elements.append(Spacer(1, 0.3 * inch))
        
        # ==========================================
        # 4. Trigger Pemeliharaan (Mandatory Grounding)
        # ==========================================
        elements.append(Paragraph("3. Status Kesiapan Armada (Maintenance Trigger)", self.heading_style))
        elements.append(Spacer(1, 0.1 * inch))
        
        grounded = simulation_data.get("newly_grounded_aircraft", [])
        if grounded:
            elements.append(Paragraph(f"Terdapat <b>{len(grounded)}</b> pesawat yang telah melampaui batas aman operasional. Status telah diubah menjadi <b>MANDATORY GROUNDING</b>.", self.alert_style))
            elements.append(Spacer(1, 0.1 * inch))
            
            grounded_data = [["No", "Tail Number", "Total Akumulasi Jam Terbang"]]
            for idx, g in enumerate(grounded, start=1):
                grounded_data.append([str(idx), str(g.get('tail_number', '-')), f"{g.get('hours', 0):.2f} Jam"])
                
            g_table = Table(grounded_data, colWidths=[0.5*inch, 2.5*inch, 3*inch])
            g_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c0392b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(g_table)
        else:
            elements.append(Paragraph("Seluruh pesawat yang dikerahkan terpantau aman (jam terbang masih berada dalam toleransi yang ditetapkan).", self.normal_style))
        
        # ==========================================
        # Compile/Render Dokumen PDF
        # ==========================================
        doc.build(elements)
        buffer.seek(0)
        return buffer
