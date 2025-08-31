const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const poppler = require("pdf-poppler");
const stringSimilarity = require("string-similarity");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

/* -------------------------------- PDF -> Images ------------------------------- */
async function convertPDFtoImages(pdfPath, outputDir) {
  const opts = {
    format: "png",
    out_dir: outputDir,
    out_prefix: "page",
    page: null,
  };

  try {
    await poppler.convert(pdfPath, opts);
    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".png"))
      .map((f) => path.join(outputDir, f))
      .sort();
    return files;
  } catch (err) {
    console.error("PDF to image conversion error:", err.message);
    return [];
  }
}

/* ------------------------------ Extract PDF text ------------------------------ */
async function extractTextFromPDF(pdfPath) {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjsLib.getDocument(pdfPath).promise;
    let htmlPages = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      // Group words by "y" (line) and order by "x"
      const lines = {};
      content.items.forEach((item) => {
        const tx = item.transform;
        const x = tx[4];
        const y = Math.round(tx[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push({ str: item.str, x });
      });

      const sortedYs = Object.keys(lines)
        .map(Number)
        .sort((a, b) => b - a);

      const pageText = sortedYs
        .map((y) =>
          lines[y]
            .sort((a, b) => a.x - b.x)
            .map((w) => w.str)
            .join(" ")
        )
        .join("\n");

      const pageHTML = `
        <div style="
          background:#1a2036;
          color:#ffffff;
          padding:1rem;
          border-radius:8px;
          margin:10px 0;
          text-align:left;
          line-height:1.6;
          font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          white-space:pre-wrap;
        ">
          ${pageText}
        </div>
      `;

      htmlPages.push({ page: i, text: pageText, html: pageHTML });
    }

    return htmlPages;
  } catch (error) {
    console.error("Error extracting PDF text with layout:", error.message);
    return null;
  }
}

/* ---------------------------------- Helpers ---------------------------------- */
function normalizeForComparison(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\w]/g, "");
}

function extractValue(regex, text, groupIndex = 1) {
  const m = regex.exec(text);
  return m ? String(m[groupIndex]).trim().replace(/\s{2,}/g, " ") : null;
}

/**
 * Extracts a name from the document using multiple strategies.
 * @param {string} fullText - The entire text of the document.
 * @param {string} role - The role to search for ('tenant' or 'landlord').
 * @param {string} [hint] - Optional user-provided name to help find the best match as a fallback.
 * @returns {string|null} The extracted name or null if not found.
 */
function extractName(fullText, role, hint) {
  const oneLine = fullText.replace(/\s+/g, " ");

  // Strategy 1: Look for explicit labels (most reliable)
  const labelRegex = new RegExp(
    `(?:${role}|${role === "tenant" ? "lessee" : "lessor"})(?:\\s*name)?\\s*[:\\-]?\\s*([A-Za-z.\\s]{4,40})`,
    "i"
  );
  let match = extractValue(labelRegex, oneLine);
  if (match) return match;

  // Strategy 2: Look for contextual phrases like "BETWEEN landlord AND tenant"
  const betweenRegex = /between\s+([A-Za-z.\s]{4,40?})\s+(?:and|represented by)\s+([A-Za-z.\s]{4,40?})/i;
  const betweenMatch = betweenRegex.exec(oneLine);
  if (betweenMatch) {
    // A common convention is that the landlord is mentioned first.
    return role === "landlord" ? betweenMatch[1].trim() : betweenMatch[2].trim();
  }

  // Strategy 3 (Fallback): If a hint is provided, find the most similar name in the text
  if (hint) {
    // Find all plausible looking names (e.g., two capitalized words together)
    const potentialNames = fullText.match(/[A-Z][a-z']+(?:\s+[A-Z][a-z']+)+/g) || [];
    if (potentialNames.length > 0) {
      const { bestMatch } = stringSimilarity.findBestMatch(hint, potentialNames);
      // Only return if the match is reasonably good (e.g., > 50% similar)
      if (bestMatch.rating > 0.5) {
        return bestMatch.target;
      }
    }
  }
  
  return null; // Return null if no strategy worked
}


// A safer pushResult that ALWAYS shows the document data and uses flexible comparison
function pushResult(details, field, userData, docValue) {
  const dataFromDocument = docValue ? String(docValue).trim().replace(/\s{2,}/g, " ") : "-";
  let status = "❌ Not Found";
  let isMatch = false;

  if (dataFromDocument !== "-") {
    if (userData) {
      const userNorm = normalizeForComparison(userData);
      const docNorm = normalizeForComparison(dataFromDocument);

      // Use string similarity for a more "liberal" comparison
      const similarity = stringSimilarity.compareTwoStrings(userNorm, docNorm);

      if (similarity > 0.7) { // Threshold for a confident match (adjust as needed)
        status = "✅ Match";
        isMatch = true;
      } else {
        status = "❌ Mismatch";
      }
    } else {
      // Data was found, but user didn't provide input for comparison
      status = "ℹ️ Found";
    }
  }
  // If dataFromDocument is "-", status remains "❌ Not Found"

  details.push({
    field,
    userData: userData || "-",
    dataFromDocument, // This now ALWAYS shows what was extracted
    status,
  });

  return isMatch || !userData; // A success is a match OR if no user data was provided to check
}

// Try to pull a plausible address/line
function extractLocation(fullText) {
  const lines = fullText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Prefer lines that look like addresses
  for (let i = 0; i < lines.length; i++) {
    if (
      /^(flat|plot|door|apt|apartment|house|villa|no\.?|d\.no\.?)/i.test(
        lines[i]
      ) ||
      /(located at|situated at|property located at|address)/i.test(lines[i])
    ) {
      let loc = lines[i];
      if (/,[:]*\s*$/.test(loc) && lines[i + 1]) loc += " " + lines[i + 1];
      return loc;
    }
  }

  // Fallback: look for Flat ... up to a 6-digit pincode or end of clause
  const oneLine = fullText.replace(/\n+/g, " ");
  const m =
    /(Flat\s\S.+?)(?:,\s*(?:Chennai|Bengaluru|Hyderabad|Mumbai|Delhi)[^,]*|,?\s*\b\d{6}\b|$)/i.exec(
      oneLine
    );
  if (m) return m[1].trim();

  return null;
}

/* --------------------------- Field-by-field compare --------------------------- */
function compareRentalFields(fullText, inputs) {
  const details = [];
  let allMatch = true;

  const oneLine = fullText.replace(/\s+/g, " ");

  // --- Rent Amount ---
  const rentMatch = extractValue(
    /(?:monthly\s+)?rent[^0-9₹rs$]*[₹\sRs$]*([0-9]{3,7})/i,
    oneLine
  );
  if (!pushResult(details, "Rent Amount", inputs.rentAmount, rentMatch))
    allMatch = false;

  // --- Start Date ---
  const startDateMatch =
    extractValue(
      /(?:from|start(?:ed)?|commencement)\s*([0-3]?\d[-/][0-1]?\d[-/]\d{4})/i,
      oneLine
    ) ||
    extractValue(
      /start\s*date\s*[:\-]?\s*([0-3]?\d[-/][0-1]?\d[-/]\d{4})/i,
      oneLine
    );
  if (!pushResult(details, "Start Date", inputs.startDate, startDateMatch))
    allMatch = false;

  // --- End Date ---
  const endDateMatch =
    extractValue(
      /(?:to|till|till\s*date|end(?:ed)?|expiry|valid\s*till)\s*([0-3]?\d[-/][0-1]?\d[-/]\d{4})/i,
      oneLine
    ) ||
    extractValue(
      /end\s*date\s*[:\-]?\s*([0-3]?\d[-/][0-1]?\d[-/]\d{4})/i,
      oneLine
    );
  if (!pushResult(details, "End Date", inputs.endDate, endDateMatch))
    allMatch = false;

  // --- Tenant Name (using the new robust extractor) ---
  const tenantMatch = extractName(fullText, 'tenant', inputs.tenantName);
  if (!pushResult(details, "Tenant Name", inputs.tenantName, tenantMatch))
    allMatch = false;

  // --- Landlord Name (using the new robust extractor) ---
  const landlordMatch = extractName(fullText, 'landlord', inputs.landlordName);
  if (!pushResult(details, "Landlord Name", inputs.landlordName, landlordMatch))
    allMatch = false;

  // --- Property Location ---
  const locationMatch = extractLocation(fullText);
  if (!pushResult(details, "Property Location", inputs.propertyLocation, locationMatch))
    allMatch = false;

  return { status: allMatch ? "Original" : "Fake", details };
}

/* --------------------------------- Analysis ---------------------------------- */
function generateAnalysis(docType, details) {
  if (docType === "rental") {
    const getDetail = (fieldName) =>
      details.find((d) => d.field === fieldName)?.dataFromDocument || "[not found]";

    const landlord = getDetail("Landlord Name");
    const tenant = getDetail("Tenant Name");
    const rent = getDetail("Rent Amount");
    const startDate = getDetail("Start Date");
    const location = getDetail("Property Location");

    const rentText = rent && rent !== "-" ? `₹${rent}` : "[not specified]";

    return `This appears to be a rental agreement between the landlord, ${landlord}, and the tenant, ${tenant}. The agreement, starting on ${startDate}, is for the property located at ${location}. The specified monthly rent is ${rentText}. The following table breaks down the comparison between the user-provided data and the document's contents.`;
  }

  return "Analysis for this document type has not been implemented.";
}

/* ---------------------------------- API -------------------------------------- */
app.post("/api/verify-document", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No document uploaded." });
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-verifier-"));

  try {
    const verificationId = crypto.randomUUID();
    console.log(`Starting verification process with ID: ${verificationId}`);

    const { docType } = req.body;
    const pdfPath = req.file.path;

    const [images, pageTexts] = await Promise.all([
      convertPDFtoImages(pdfPath, tempDir),
      extractTextFromPDF(pdfPath),
    ]);

    if (!Array.isArray(images) || images.length === 0) {
      throw new Error(
        "CRITICAL: PDF to image conversion failed. Check 'poppler' installation."
      );
    }

    if (!pageTexts || !pageTexts.some((p) => p.text.length > 0)) {
      throw new Error(
        "CRITICAL: Direct text extraction failed. The PDF likely has no text layer."
      );
    }

    const imageBase64 = images.map((img) =>
      fs.readFileSync(img).toString("base64")
    );
    const fullText = pageTexts.map((p) => p.text).join("\n");

    const result = compareRentalFields(fullText, req.body);
    const analysis = generateAnalysis(docType, result.details);

    res.json({
      ...result,
      verificationId,
      images: imageBase64,
      extractedText: pageTexts,
      analysis,
    });
  } catch (err) {
    console.error("Error verifying document:", err.message);
    res.status(500).json({
      error: "Failed to verify document.",
      details: err.message,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(req.file.path);
  }
});

/* --------------------------------- Server ------------------------------------ */
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);