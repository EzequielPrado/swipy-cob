import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateBlankEmployeeForm = (companyName: string) => {
  const doc = new jsPDF();
  
  // 1. HEADER
  doc.setFillColor(249, 115, 22); // Swipy Orange
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE CADASTRO", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`EMPRESA: ${companyName.toUpperCase()}`, 14, 30);
  doc.text("DOCUMENTO PARA COLETA DE DADOS PRÉ-ADMISSÃO", 14, 35);

  let currentY = 50;

  const createSection = (title: string, fields: string[][]) => {
    doc.setFontSize(10);
    doc.setTextColor(249, 115, 22);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 14, currentY);
    
    autoTable(doc, {
      body: fields,
      startY: currentY + 3,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4, minCellHeight: 10 },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', fillColor: [250, 250, 250] } },
      margin: { left: 14, right: 14 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  };

  // 1. IDENTIDADE
  createSection("1. Dados de Identidade", [
    ["Nome Completo", ""],
    ["Nome Social", ""],
    ["CPF", ""],
    ["RG / Órgão / Emissão", ""],
    ["Data de Nascimento", ""],
    ["Sexo / Gênero", ""],
    ["Estado Civil", ""],
    ["Nacionalidade", ""],
    ["Pai / Mãe", ""],
    ["Raça / Cor", ""],
    ["Possui Deficiência?", " ( ) Não  ( ) Sim: ____________________"]
  ]);

  // 2. ENDEREÇO E CONTATO
  createSection("2. Endereço e Contato", [
    ["CEP", ""],
    ["Rua / Número", ""],
    ["Bairro / Cidade / UF", ""],
    ["E-mail Pessoal", ""],
    ["Telefone / WhatsApp", ""]
  ]);

  // 3. DADOS BANCÁRIOS (PARA PAGAMENTO)
  createSection("3. Informações Bancárias", [
    ["Banco", ""],
    ["Agência / Conta", ""],
    ["Tipo", " ( ) Corrente  ( ) Poupança"],
    ["Chave PIX", ""]
  ]);

  // 4. DOCUMENTOS E BENEFÍCIOS
  createSection("4. Documentação e Benefícios", [
    ["PIS / PASEP", ""],
    ["CTPS (Nº e Série)", ""],
    ["Título de Eleitor", ""],
    ["CNH (Nº e Categoria)", ""],
    ["Plano de Saúde", ""],
    ["Vale Transporte", " ( ) Não optante  ( ) Sim, linhas: _________"]
  ]);

  // 5. SAÚDE E ASSINATURA
  doc.addPage();
  currentY = 20;
  createSection("5. Saúde Ocupacional", [
    ["Tipo Sanguíneo", ""],
    ["Alergias Conhecidas", ""],
    ["Medicamentos Contínuos", ""]
  ]);

  currentY += 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Declaro que as informações acima são verdadeiras e de minha responsabilidade.", 14, currentY);
  
  currentY += 25;
  doc.line(14, currentY, 100, currentY);
  doc.text("Assinatura do Colaborador", 14, currentY + 5);
  
  doc.line(120, currentY, 195, currentY);
  doc.text("Data", 120, currentY + 5);

  doc.save(`Ficha_Cadastro_Em_Branco.pdf`);
};

export const generateRetentionReport = (companyName: string, employees: any[]) => {
  const doc = new jsPDF();
  const activeCount = employees.filter(e => e.status === 'Ativo').length;
  const inactiveCount = employees.filter(e => e.status === 'Inativo').length;
  const totalCount = employees.length;
  
  const turnoverRate = totalCount > 0 ? ((inactiveCount / totalCount) * 100).toFixed(1) : "0";

  // HEADER
  doc.setFillColor(29, 29, 31); // Apple Black
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(249, 115, 22);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE RETENÇÃO", 14, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`${companyName.toUpperCase()} | PEOPLE ANALYTICS`, 14, 33);
  doc.text(`GERADO EM: ${new Date().toLocaleString('pt-BR')}`, 14, 38);

  // KPIs
  doc.setFillColor(245, 245, 247);
  doc.roundedRect(14, 55, 182, 35, 3, 3, 'F');
  
  doc.setTextColor(29, 29, 31);
  doc.setFontSize(9);
  doc.text("HEADCOUNT ATIVO", 25, 65);
  doc.text("DESLIGAMENTOS", 85, 65);
  doc.text("TAXA DE TURNOVER", 145, 65);
  
  doc.setFontSize(22);
  doc.text(activeCount.toString(), 25, 80);
  doc.text(inactiveCount.toString(), 85, 80);
  doc.setTextColor(249, 115, 22);
  doc.text(`${turnoverRate}%`, 145, 80);

  // TABELA DE COLABORADORES ATIVOS
  doc.setTextColor(29, 29, 31);
  doc.setFontSize(12);
  doc.text("Quadro de Colaboradores Ativos", 14, 105);

  const activeRows = employees
    .filter(e => e.status === 'Ativo')
    .map(e => [
      e.full_name,
      e.department,
      e.job_role,
      new Date(e.hire_date).toLocaleDateString('pt-BR'),
      e.employment_type
    ]);

  autoTable(doc, {
    head: [['NOME COMPLETO', 'DEPARTAMENTO', 'CARGO', 'ADMISSÃO', 'TIPO']],
    body: activeRows,
    startY: 110,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22] },
    styles: { fontSize: 8 }
  });

  // TABELA DE DESLIGAMENTOS (SE HOUVER)
  if (inactiveCount > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.text("Histórico de Desligamentos", 14, finalY);

    const inactiveRows = employees
      .filter(e => e.status === 'Inativo')
      .map(e => [
        e.full_name,
        e.department,
        new Date(e.termination_date).toLocaleDateString('pt-BR'),
        e.termination_type || 'Não informado',
        e.termination_reason || '---'
      ]);

    autoTable(doc, {
      head: [['NOME', 'DEPTO', 'DATA SAÍDA', 'TIPO RESCISÃO', 'MOTIVO']],
      body: inactiveRows,
      startY: finalY + 5,
      theme: 'striped',
      headStyles: { fillColor: [150, 150, 150] },
      styles: { fontSize: 8 }
    });
  }

  doc.save(`Relatorio_Retencao_${companyName.replace(/\s+/g, '_')}.pdf`);
};