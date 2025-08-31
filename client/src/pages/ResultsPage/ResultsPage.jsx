import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ResultsPage.css";

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { result } = location.state || {};

  // Diagnostic log to help debug client-side issues
  useEffect(() => {
    if (result && result.verificationId) {
      console.log("RESULTS PAGE LOADED WITH VERIFICATION ID:", result.verificationId);
    }
  }, [result]);

  if (!result) {
    return (
      <div className="error-container">
        <h2>No results found</h2>
        <button onClick={() => navigate("/")}>Go Back</button>
      </div>
    );
  }

  const uniqueImages = result.images ? [...new Set(result.images)] : [];

  return (
    <div className="results-container">
      {/* 1. Header with Verdict & Verification ID */}
      <div className="verdict-header">
        <h1>Verification Results</h1>
        <p className={result.status === "Original" ? "verdict-original" : "verdict-fake"}>
          {result.status === "Original" ? "✅ Original Document" : "❌ Fake Document"}
        </p>
        {result.verificationId && (
          <p className="verification-id">
            <strong>Verification ID:</strong> {result.verificationId}
          </p>
        )}
      </div>

      {/* 2. PDF Images Section */}
      <div className="summary-section">
        <h3>Uploaded Document Preview</h3>
        {uniqueImages.length > 0 ? (
          uniqueImages.map((img, idx) => (
            <div key={idx} className="pdf-image-wrapper">
              <p>Page {idx + 1}</p>
              <img src={`data:image/png;base64,${img}`} alt={`Page ${idx + 1}`} />
            </div>
          ))
        ) : <p>No PDF images available.</p>}
      </div>

      {/* 3. Extracted Text Section (with alignment preserved) */}
      <div className="summary-section">
        <h3>Extracted Text from Document</h3>
        {result.extractedText && result.extractedText.length > 0 ? (
          result.extractedText.map((pageData) => (
            <div key={pageData.page} className="extracted-text-page">
              <h4>Page {pageData.page}</h4>
              <div
                className="page-html-content"
                dangerouslySetInnerHTML={{ __html: pageData.html }}
              />
            </div>
          ))
        ) : (
          <p>No text could be extracted from the document.</p>
        )}
      </div>
        
      
          
          
        
      
    
  
    
  


      

      {/* 4. Analysis and Comparison Table Section */}
      <div className="summary-section">
        <h3>Analysis and Field Verification</h3>
        {result.analysis && <p className="analysis-text">{result.analysis}</p>}
        
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>User Data</th>
                <th>Data From Document</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.details && result.details.length > 0 ? (
                result.details.map((d, idx) => (
                  <tr key={idx}>
                    <td>{d.field}</td>
                    <td className="document-data-cell">{d.userData || "-"}</td>
                    <td className="document-data-cell">{d.dataFromDocument || "-"}</td>
                    <td className={d.status === "✅ Match" ? "status-match" : "status-mismatch"}>
                      {d.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No verification details available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optional: Reason for Fake Verdict */}
      {result.status !== "Original" && (
        <div className="mismatch-reason">
          <strong>Reason for "Fake" Verdict:</strong>
          <p>One or more fields did not match the data extracted from the document. Please review the mismatches highlighted in the table above.</p>
        </div>
      )}

      <button className="back-link" onClick={() => navigate("/")}>
        Verify Another Document
      </button>
    </div>
  );
};

export default ResultsPage;