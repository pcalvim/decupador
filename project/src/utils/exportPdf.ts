import * as html2canvas from 'html-to-image';
import { jsPDF } from 'jspdf';

export const exportPdf = async (elementRef: HTMLElement): Promise<void> => {
  if (!elementRef) {
    throw new Error('No element provided for PDF export');
  }
  
  try {
    // Capture the DOM content as an image
    const dataUrl = await html2canvas.toJpeg(elementRef, {
      quality: 0.95,
      pixelRatio: 2, // Higher quality
      canvasWidth: elementRef.scrollWidth,
      canvasHeight: elementRef.scrollHeight
    });
    
    // Create an image element from the data URL
    const img = new Image();
    img.src = dataUrl;
    
    // Wait for the image to load
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    
    // Calculate dimensions for PDF (use A4 landscape as base)
    const imgWidth = 297; // A4 width in mm (landscape)
    const imgHeight = (img.height * imgWidth) / img.width;
    
    // Create PDF instance (landscape orientation)
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    // Add the image to the PDF
    pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidth, imgHeight);
    
    // If content is taller than a single page, handle multiple pages
    if (imgHeight > 210) { // A4 height in mm (landscape)
      let remainingHeight = imgHeight;
      let currentPosition = 0;
      const pageHeight = 210; // A4 height in mm
      
      // Skip the first page as we've already added it
      currentPosition += pageHeight;
      remainingHeight -= pageHeight;
      
      // Add additional pages as needed
      while (remainingHeight > 0) {
        pdf.addPage();
        pdf.addImage(
          dataUrl,
          'JPEG',
          0,
          -currentPosition,
          imgWidth,
          imgHeight
        );
        
        currentPosition += pageHeight;
        remainingHeight -= pageHeight;
      }
    }
    
    // Download the PDF
    pdf.save('storyboard.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};