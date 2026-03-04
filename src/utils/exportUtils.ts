import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(item => 
    Object.values(item).map(val => 
      typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${val}"`
    ).join(",")
  );

  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: any[], title: string, filename: string) => {
  const doc = new jsPDF();
  
  // Cabeçalho do PDF
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

  // Mapear dados para a tabela
  const tableColumn = ["Nome", "E-mail", "WhatsApp", "CPF/CNPJ", "Status"];
  const tableRows = data.map(item => [
    item.name,
    item.email,
    item.phone || 'N/A',
    item.tax_id,
    item.status || 'N/A'
  ]);

  // @ts-ignore - jspdf-autotable extension
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    theme: 'grid',
    headStyles: { fillStyle: '#f97316', textColor: 255 },
    styles: { fontSize: 9 }
  });

  doc.save(`${filename}.pdf`);
};