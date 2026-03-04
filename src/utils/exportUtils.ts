import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  // Extrair apenas campos relevantes para o CSV
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

  const csvContent = "\uFEFF" + [headers, ...rows].join("\n"); // Adiciona BOM para Excel ler acentos
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
  doc.setTextColor(33, 33, 33);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

  // Mapear dados para a tabela
  const tableColumn = ["Nome", "E-mail", "WhatsApp", "CPF/CNPJ", "Status"];
  const tableRows = data.map(item => [
    item.name,
    item.email,
    item.phone || '---',
    item.tax_id,
    item.status?.toUpperCase() || '---'
  ]);

  // Usando a função autoTable diretamente conforme padrão ESM
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    theme: 'striped',
    headStyles: { 
      fillColor: [249, 115, 22], // Laranja Swipy
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    styles: { 
      fontSize: 9,
      cellPadding: 3
    }
  });

  doc.save(`${filename}.pdf`);
};