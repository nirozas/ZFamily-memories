import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Service to handle exporting content to different formats
 */
export const printService = {
    /**
     * Export a list of HTMLElements (pages) to a single PDF
     */
    async exportToPDF(pages: HTMLElement[], title: string, scale: number = 2) {
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [600, 840] // Matching our max page size
        });

        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], {
                scale: scale, // Dynamic quality (2=150dpiish, 4=300dpi, 6=450dpi, 8=600dpi roughly based on standard screen density)
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            if (i > 0) pdf.addPage([600, 840], 'p');
            pdf.addImage(imgData, 'JPEG', 0, 0, 600, 840);
        }

        pdf.save(`${title.replace(/\s+/g, '_')}_Archive.pdf`);
    },

    /**
     * Generate an interactive HTML5 bundle (offline viewer)
     * Simplified version for demonstration - would normally involve a template
     */
    async exportToHTML5(albumData: any) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${albumData.title} - Offline Archive</title>
    <style>
        body { font-family: serif; background: #fdfcfb; display: flex; flex-direction: column; align-items: center; padding: 40px; }
        .page { background: white; width: 600px; height: 840px; margin: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); position: relative; }
        h1 { color: #3d3b38; }
    </style>
</head>
<body>
    <h1>${albumData.title}</h1>
    <p>Offline Archive Generated on ${new Date().toLocaleDateString()}</p>
    <div id="pages">
        ${albumData.pages.map((p: any, i: number) => `
            <div class="page" style="background-color: ${p.backgroundColor}">
               <div style="position: absolute; bottom: 20px; right: 20px; color: #999;">Page ${i + 1}</div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${albumData.title.replace(/\s+/g, '_')}_Offline.html`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
