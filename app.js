document.addEventListener('DOMContentLoaded', () => {
    const entryBody = document.getElementById('entry-body');
    const addRowBtn = document.getElementById('add-row-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');
    const resultsBody = document.getElementById('results-body');
    const exportPdfResultBtn = document.getElementById('export-pdf-result-btn');
    const exportPdfDetailBtn = document.getElementById('export-pdf-detail-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const pdfDateDisplayResult = document.getElementById('pdf-date-display-result');
    const pdfDateDisplayDetail = document.getElementById('pdf-date-display-detail');
    const eventDateInput = document.getElementById('event-date');
    const pdfHeaderResult = document.getElementById('pdf-header-result');
    const pdfHeaderDetail = document.getElementById('pdf-header-detail');

    let rowCount = 0;
    let currentResults = [];

    // Initialize state from Local Storage or add one row
    if (!loadState()) {
        addRow();
    }

    // Auto-save on any input in the table
    entryBody.addEventListener('input', saveState);

    addRowBtn.addEventListener('click', addRow);
    calculateBtn.addEventListener('click', calculateResults);
    exportPdfResultBtn.addEventListener('click', exportResultToPDF);
    exportPdfDetailBtn.addEventListener('click', exportDetailToPDF);
    exportCsvBtn.addEventListener('click', exportToCSV);

    // Set today's date by default
    const today = new Date().toISOString().split('T')[0];
    eventDateInput.value = today;

    function addRow() {
        rowCount++;
        const tr = document.createElement('tr');
        tr.dataset.rowId = rowCount;

        // Name, HC, Cat
        let html = `
            <td><input type="text" class="glass-input input-name" data-field="name" placeholder="Nome"></td>
            <td><input type="number" class="glass-input input-hc" data-field="hc" min="0"></td>
            <td>
                <select class="glass-input input-cat" data-field="cat">
                    <option value="1">1</option>
                    <option value="2">2</option>
                </select>
            </td>
        `;

        // 18 Holes
        for (let i = 1; i <= 18; i++) {
            html += `<td><input type="number" class="glass-input input-hole" data-field="hole" data-hole="${i}" min="1"></td>`;
            if (i === 6) html += `<td><span class="calc-cell" data-sum="1">-</span></td>`;
            if (i === 12) html += `<td><span class="calc-cell" data-sum="2">-</span></td>`;
            if (i === 18) html += `<td><span class="calc-cell" data-sum="3">-</span></td>`;
        }

        // Gross and Net
        html += `<td><span class="calc-cell calc-total" data-sum="gross">-</span></td>`;
        html += `<td><span class="calc-cell calc-total" data-sum="net">-</span></td>`;

        // Remove button
        html += `<td><button class="btn-remove" title="Remover" tabindex="-1">×</button></td>`;

        tr.innerHTML = html;
        entryBody.appendChild(tr);

        attachRowEvents(tr);
    }

    function attachRowEvents(tr) {
        const removeBtn = tr.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => {
            if (entryBody.children.length > 1) {
                tr.remove();
            }
        });

        const nameInput = tr.querySelector('.input-name');
        nameInput.addEventListener('input', (e) => {
            if (e.target.value.toLowerCase() === 'teste') {
                e.target.value = 'Jogador Teste ' + tr.dataset.rowId;
                fillRandomData(tr);
            }
        });

        const holeInputs = tr.querySelectorAll('.input-hole');
        const hcInput = tr.querySelector('.input-hc');

        // Whenever HC changes, we might want to update styling and net score
        hcInput.addEventListener('input', () => {
            updateRowStyling(tr);
            updateRowSums(tr);
        });

        holeInputs.forEach((input, index) => {
            // Rapid Entry UX
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                updateCellStyling(input, hcInput.value);
                updateRowSums(tr);

                if (val.length === 1) {
                    const num = parseInt(val, 10);
                    // If 2-9, auto advance
                    if (num >= 2 && num <= 9) {
                        focusNextHole(holeInputs, index);
                    }
                    // If 1, do nothing (wait for next digit or enter)
                } else if (val.length >= 2) {
                    // E.g., 10, 11, 12...
                    focusNextHole(holeInputs, index);
                }
            });

            input.addEventListener('keydown', (e) => {
                // If Enter is pressed and there's a value (like '1'), advance
                if (e.key === 'Enter') {
                    e.preventDefault();
                    focusNextHole(holeInputs, index);
                }
            });
        });
    }

    function focusNextHole(holeInputs, currentIndex) {
        if (currentIndex < holeInputs.length - 1) {
            holeInputs[currentIndex + 1].focus();
        }
    }

    function updateRowSums(tr) {
        const hc = parseInt(tr.querySelector('.input-hc').value, 10) || 0;
        const holeInputs = tr.querySelectorAll('.input-hole');
        
        let sum1 = 0, sum2 = 0, sum3 = 0;
        let c1 = 0, c2 = 0, c3 = 0;

        holeInputs.forEach(input => {
            const h = parseInt(input.dataset.hole, 10);
            const val = parseInt(input.value, 10);
            if (!isNaN(val)) {
                if (h <= 6) { sum1 += val; c1++; }
                else if (h <= 12) { sum2 += val; c2++; }
                else { sum3 += val; c3++; }
            }
        });

        tr.querySelector('[data-sum="1"]').textContent = c1 > 0 ? sum1 : '-';
        tr.querySelector('[data-sum="2"]').textContent = c2 > 0 ? sum2 : '-';
        tr.querySelector('[data-sum="3"]').textContent = c3 > 0 ? sum3 : '-';

        const totalGross = sum1 + sum2 + sum3;
        const totalCount = c1 + c2 + c3;
        
        tr.querySelector('[data-sum="gross"]').textContent = totalCount > 0 ? totalGross : '-';
        tr.querySelector('[data-sum="net"]').textContent = totalCount > 0 ? (totalGross - hc) : '-';
    }

    function saveState() {
        const rows = entryBody.querySelectorAll('tr');
        const state = Array.from(rows).map(row => {
            return {
                name: row.querySelector('.input-name').value,
                hc: row.querySelector('.input-hc').value,
                cat: row.querySelector('.input-cat').value,
                holes: Array.from(row.querySelectorAll('.input-hole')).map(inp => inp.value)
            };
        });
        localStorage.setItem('golfAppDraft', JSON.stringify(state));
    }

    function loadState() {
        const saved = localStorage.getItem('golfAppDraft');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state && state.length > 0) {
                    entryBody.innerHTML = '';
                    rowCount = 0;
                    state.forEach(rowData => {
                        addRow();
                        const tr = entryBody.lastElementChild;
                        tr.querySelector('.input-name').value = rowData.name;
                        tr.querySelector('.input-hc').value = rowData.hc;
                        tr.querySelector('.input-cat').value = rowData.cat;
                        const holeInputs = tr.querySelectorAll('.input-hole');
                        rowData.holes.forEach((val, idx) => {
                            if (holeInputs[idx]) holeInputs[idx].value = val;
                        });
                        updateRowStyling(tr);
                        updateRowSums(tr);
                    });
                    return true;
                }
            } catch (e) {
                console.error("Erro ao carregar rascunho", e);
            }
        }
        return false;
    }

    function fillRandomData(tr) {
        const hcInput = tr.querySelector('.input-hc');
        const catSelect = tr.querySelector('.input-cat');
        const holeInputs = tr.querySelectorAll('.input-hole');

        // Random HC between 0 and 36
        const hc = Math.floor(Math.random() * 37);
        hcInput.value = hc;
        // Random Cat 1 or 2
        catSelect.value = Math.random() > 0.5 ? '1' : '2';

        const mu = (54 + hc) / 18;

        holeInputs.forEach(input => {
            // Generate score close to mu.
            let r = Math.random();
            let score;
            
            if (r < 0.01) {
                score = 1; // 1% hole in one
            } else if (r < 0.06) {
                score = 2; // 5% birdie
            } else {
                // Normal approximation around mu
                const u = 1 - Math.random(); // Sub 0 is not allowed
                const v = Math.random();
                const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                // standard deviation of ~1.5
                score = Math.round(mu + z * 1.5);
                
                if (score < 3) score = 3; // Cap lower end of bell curve to par (since 1 and 2 are handled)
                if (score > 10) score = 10; // Cap max
            }

            input.value = score;
        });

        updateRowStyling(tr);
        updateRowSums(tr);
    }

    function getNetDoubleBogeyLimit(hc) {
        if (isNaN(hc)) return 99; // no limit if no hc
        if (hc <= 12) return 5;
        if (hc <= 24) return 6;
        return 7;
    }

    function updateCellStyling(input, hcValue) {
        const hc = parseInt(hcValue, 10);
        const limit = getNetDoubleBogeyLimit(hc);
        const val = parseInt(input.value, 10);

        if (!isNaN(val) && val >= limit) {
            input.classList.add('hole-danger');
        } else {
            input.classList.remove('hole-danger');
        }
    }

    function updateRowStyling(tr) {
        const hcValue = tr.querySelector('.input-hc').value;
        const holeInputs = tr.querySelectorAll('.input-hole');
        holeInputs.forEach(input => {
            if (input.value !== '') {
                updateCellStyling(input, hcValue);
            }
        });
    }

    function calculateResults() {
        const rows = entryBody.querySelectorAll('tr');
        const results = [];

        rows.forEach(row => {
            const name = row.querySelector('.input-name').value.trim();
            if (!name) return; // Skip empty rows

            const hc = parseInt(row.querySelector('.input-hc').value, 10) || 0;
            const cat = parseInt(row.querySelector('.input-cat').value, 10) || 1;
            
            let gross = 0;
            let netDoubleBogeyTotal = 0;
            const limit = getNetDoubleBogeyLimit(hc);

            const holeInputs = row.querySelectorAll('.input-hole');
            holeInputs.forEach(input => {
                const val = parseInt(input.value, 10) || 0;
                gross += val;

                // Adjust for Net Double Bogey
                const adjustedVal = val > limit ? limit : val;
                netDoubleBogeyTotal += adjustedVal;
            });

            const net = gross - hc;
            
            const holes = Array.from(holeInputs).map(inp => parseInt(inp.value, 10) || 0);
            const sum1 = holes.slice(0, 6).reduce((a, b) => a + b, 0);
            const sum2 = holes.slice(6, 12).reduce((a, b) => a + b, 0);
            const sum3 = holes.slice(12, 18).reduce((a, b) => a + b, 0);

            results.push({ name, hc, cat, gross, net, netDoubleBogeyTotal, holes, sum1, sum2, sum3 });
        });

        if (results.length === 0) {
            alert('Por favor, preencha pelo menos um jogador com nome.');
            return;
        }

        // Sort: Category ASC, then Net Score ASC
        results.sort((a, b) => {
            if (a.cat !== b.cat) {
                return a.cat - b.cat;
            }
            return a.net - b.net;
        });

        currentResults = results;
        renderResults(results);
    }

    function renderResults(results) {
        resultsBody.innerHTML = '';
        
        results.forEach((res, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${res.name}</td>
                <td>${res.cat}</td>
                <td>${res.gross}</td>
                <td><strong>${res.net}</strong></td>
                <td>${res.netDoubleBogeyTotal}</td>
            `;
            resultsBody.appendChild(tr);
        });

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        renderDetailedResults(results);
    }

    function renderDetailedResults(results) {
        const detailedBody = document.getElementById('detailed-results-body');
        detailedBody.innerHTML = '';

        // Order by Name or Net
        results.forEach((res) => {
            const tr = document.createElement('tr');
            
            let html = `<td>${res.name}</td><td>${res.hc}</td>`;
            
            for(let i=0; i<6; i++) html += `<td>${res.holes[i]}</td>`;
            html += `<td style="font-weight:bold;">${res.sum1}</td>`;
            
            for(let i=6; i<12; i++) html += `<td>${res.holes[i]}</td>`;
            html += `<td style="font-weight:bold;">${res.sum2}</td>`;
            
            for(let i=12; i<18; i++) html += `<td>${res.holes[i]}</td>`;
            html += `<td style="font-weight:bold;">${res.sum3}</td>`;
            
            html += `<td style="font-weight:bold;">${res.gross}</td>`;
            html += `<td style="font-weight:bold; color:var(--primary-color);">${res.net}</td>`;

            tr.innerHTML = html;
            detailedBody.appendChild(tr);
        });
    }

    function exportResultToPDF() {
        const element = document.getElementById('pdf-content-result');
    function exportResultToPDF() {
        if (!currentResults || currentResults.length === 0) {
            alert("Calcule os resultados primeiro!");
            return;
        }

        const dateStr = eventDateInput.value;
        const formattedDate = dateStr ? dateStr.split('-').reverse().join('/') : 'Data não informada';
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        try {
            const logo = document.querySelector('.app-logo');
            if (logo) {
                // Tenta desenhar a logo. Em modo local file:// pode dar erro de CORS em alguns navegadores.
                doc.addImage(logo, 'PNG', 14, 10, 20, 20);
            }
        } catch(e) { console.warn("Logo não pôde ser adicionada", e); }

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("Gestão de Etapas - Golf Santa Fé - Resultados Finais", 38, 18);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text("Data do Evento: " + formattedDate, 38, 25);

        const tableColumn = ["Pos", "Nome", "Cat", "Gross", "Net", "Net Double Bogey"];
        const tableRows = [];

        currentResults.forEach((res, index) => {
            tableRows.push([
                index + 1,
                res.name,
                res.cat,
                res.gross,
                res.net,
                res.netDoubleBogeyTotal
            ]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
            columnStyles: { 1: { halign: 'left' } }
        });

        doc.save('Resultados_Torneio_Golfe.pdf');
    }

    function exportDetailToPDF() {
        if (!currentResults || currentResults.length === 0) {
            alert("Calcule os resultados primeiro!");
            return;
        }

        const dateStr = eventDateInput.value;
        const formattedDate = dateStr ? dateStr.split('-').reverse().join('/') : 'Data não informada';
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        try {
            const logo = document.querySelector('.app-logo');
            if (logo) {
                doc.addImage(logo, 'PNG', 14, 10, 20, 20);
            }
        } catch(e) { console.warn("Logo não pôde ser adicionada", e); }

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("Gestão de Etapas - Golf Santa Fé - Resultados Detalhados", 38, 18);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text("Data do Evento: " + formattedDate, 38, 25);

        const tableColumn = [
            "Nome", "HC", 
            "1","2","3","4","5","6","S1",
            "7","8","9","10","11","12","S2",
            "13","14","15","16","17","18","S3",
            "Gross", "Net"
        ];
        const tableRows = [];

        currentResults.forEach(res => {
            tableRows.push([
                res.name, res.hc,
                res.holes[0], res.holes[1], res.holes[2], res.holes[3], res.holes[4], res.holes[5], res.sum1,
                res.holes[6], res.holes[7], res.holes[8], res.holes[9], res.holes[10], res.holes[11], res.sum2,
                res.holes[12], res.holes[13], res.holes[14], res.holes[15], res.holes[16], res.holes[17], res.sum3,
                res.gross, res.net
            ]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], fontSize: 8, halign: 'center', cellPadding: 1 },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
            columnStyles: { 
                0: { halign: 'left', cellWidth: 30 },
                8: { fontStyle: 'bold' },
                15: { fontStyle: 'bold' },
                22: { fontStyle: 'bold' },
                23: { fontStyle: 'bold' },
                24: { fontStyle: 'bold', textColor: [16, 185, 129] }
            }
        });

        doc.save('Detalhes_Torneio_Golfe.pdf');
    }

    function exportToCSV() {
        if (!currentResults || currentResults.length === 0) {
            alert("Calcule os resultados primeiro!");
            return;
        }

        const dateStr = eventDateInput.value;
        const formattedDate = dateStr ? dateStr : 'Data_nao_informada';

        let csvContent = "Nome,Data,Net Double Bogey\n";
        
        currentResults.forEach(res => {
            // Escape names that might have commas
            const safeName = res.name.includes(',') ? `"${res.name}"` : res.name;
            csvContent += `${safeName},${formattedDate},${res.netDoubleBogeyTotal}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `NDB_${formattedDate}.csv`);
        document.body.appendChild(link);
        
        // Small delay to ensure the DOM is ready for the click event
        setTimeout(() => {
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        }, 50);
    }
});
