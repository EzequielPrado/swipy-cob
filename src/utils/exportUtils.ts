import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const exportData = data.map(item => ({
    Nome: item.name,
    Email: item.email,
    Telefone: item.phone || '',
    Documento: item.tax_id,
    Status: item.status || '',
    CriadoEm: new Date(item.created_at).toLocaleDateString('pt-BR')
  }));

  const headers = Object.keys(exportData[0]).join(",");
  const rows = exportData.map(item => 
    Object.values(item).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
  );

  const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
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
  
  // Design de Cabeçalho Superior
  doc.setFillColor(249, 115, 22); // Swipy Orange
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Swipy ERP", 14, 22);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title.toUpperCase(), 14, 32);
  doc.text(`GERADO EM: ${new Date().toLocaleString('pt-BR')}`, 14, 38);

  const tableColumn = ["Nome do Cliente", "E-mail de Contato", "CPF / CNPJ", "Situação"];
  const tableRows = data.map(item => [
    item.name,
    item.email,
    item.tax_id,
    item.status?.toUpperCase() || 'N/A'
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 55,
    theme: 'striped',
    headStyles: { 
      fillColor: [29, 29, 31], // Apple Black para contraste
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 5
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252]
    },
    styles: { 
      fontSize: 9,
      cellPadding: 4,
      valign: 'middle'
    },
    margin: { left: 14, right: 14 }
  });

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount} - Swipy Fintech LTDA`, 105, 285, { align: 'center' });
  }

  doc.save(`${filename}.pdf`);
};