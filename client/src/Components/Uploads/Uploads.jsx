import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Upload.css";
import { Upload } from "lucide-react";

const Uploads = () => {
  const [documentFile, setDocumentFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    sales: { cost: "", saleDate: "", ownerName: "", salespersonName: "", location: "" },
    gift: { cost: "", giftDate: "", giverName: "", receiverName: "", location: "", giftType: "" },
    rental: { rentAmount: "", startDate: "", endDate: "", tenantName: "", landlordName: "", propertyLocation: "" },
    authority: { grantorName: "", granteeName: "", authorityType: "", validity: "", location: "" },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentFile(file);
      setFileName(file.name);
      setError("");
    }
  };

  const handleChange = (docType, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [field]: value,
      },
    }));
  };

  // Regular date input handler that converts to dd-mm-yyyy on submit
  const handleDateChange = (docType, field, e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [field]: value,
      },
    }));
  };

  // Format date to dd-mm-yyyy before sending to backend
  const formatDateForSubmission = (dateString) => {
    if (!dateString) return '';
    
    // If it's already in yyyy-mm-dd format (from native date input)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    }
    
    return dateString;
  };

  const mapSelectedTypeToKey = (selected) => {
    switch (selected) {
      case "Sales Document":
        return "sales";
      case "Gift Giving Document":
        return "gift";
      case "Rental Document":
        return "rental";
      case "Power of Authority":
        return "authority";
      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentFile || !selectedType) {
      setError("Please upload a document and select its type.");
      return;
    }

    const docTypeKey = mapSelectedTypeToKey(selectedType);
    if (!docTypeKey) {
      setError("Invalid document type selected.");
      return;
    }

    setIsLoading(true);
    setError("");

    // Format dates before submission
    const formattedData = { ...formData[docTypeKey] };
    
    // Format all date fields
    if (formattedData.startDate) formattedData.startDate = formatDateForSubmission(formattedData.startDate);
    if (formattedData.endDate) formattedData.endDate = formatDateForSubmission(formattedData.endDate);
    if (formattedData.saleDate) formattedData.saleDate = formatDateForSubmission(formattedData.saleDate);
    if (formattedData.giftDate) formattedData.giftDate = formatDateForSubmission(formattedData.giftDate);
    if (formattedData.validity) formattedData.validity = formatDateForSubmission(formattedData.validity);

    const data = new FormData();
    data.append("document", documentFile);
    data.append("docType", docTypeKey);
    for (const key in formattedData) {
      data.append(key, formattedData[key]);
    }

    try {
      const response = await fetch("http://localhost:5000/api/verify-document", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Server responded with an error.");
      }

      const verificationResult = await response.json();
      navigate("/results", { state: { result: verificationResult } });
    } catch (err) {
      console.error("Error verifying document:", err);
      setError(`Failed to verify document. Please ensure the server is running. [${err.message}]`);
    } finally {
      setIsLoading(false);
    }
  };

  const options = [
    "Rental Document",
    "Gift Giving Document",
    "Sales Document",
    "Power of Authority",
  ];

  return (
    <form className="upload-container" onSubmit={handleSubmit}>
      {/* Upload Section */}
      <div className="upload-box">
        <label className="upload-label">
          <input
            type="file"
            onChange={handleFileChange}
            className="file-input"
            accept="image/*,application/pdf"
          />
          <Upload size={40} className="upload-icon" />
          <p className="upload-text">
            {fileName ? fileName : "Click or Drag & Drop your document here"}
          </p>
        </label>
      </div>

      {/* Options Section */}
      <div className="options-row">
        {options.map((opt, idx) => (
          <button
            type="button"
            key={idx}
            className={`option-btn ${selectedType === opt ? "active" : ""}`}
            onClick={() => setSelectedType(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Sales */}
      {selectedType === "Sales Document" && (
        <div className="input-section">
          <h3 className="form-title">Enter Sales Document Details</h3>
          <input type="text" placeholder="Enter Cost" value={formData.sales.cost} onChange={(e) => handleChange("sales", "cost", e.target.value)} />
          <input type="date" placeholder="Sale Date" value={formData.sales.saleDate} onChange={(e) => handleDateChange("sales", "saleDate", e)} />
          <input type="text" placeholder="Enter Owner Name" value={formData.sales.ownerName} onChange={(e) => handleChange("sales", "ownerName", e.target.value)} />
          <input type="text" placeholder="Enter Salesperson Name" value={formData.sales.salespersonName} onChange={(e) => handleChange("sales", "salespersonName", e.target.value)} />
          <input type="text" placeholder="Enter Location" value={formData.sales.location} onChange={(e) => handleChange("sales", "location", e.target.value)} />
          <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Submit'}</button>
        </div>
      )}

      {/* Gift */}
      {selectedType === "Gift Giving Document" && (
        <div className="input-section">
          <h3 className="form-title">Enter Gift Giving Document Details</h3>
          <input type="text" placeholder="Enter Cost" value={formData.gift.cost} onChange={(e) => handleChange("gift", "cost", e.target.value)} />
          <input type="date" value={formData.gift.giftDate} onChange={(e) => handleDateChange("gift", "giftDate", e)} />
          <input type="text" placeholder="Enter Giver Name" value={formData.gift.giverName} onChange={(e) => handleChange("gift", "giverName", e.target.value)} />
          <input type="text" placeholder="Enter Receiver Name" value={formData.gift.receiverName} onChange={(e) => handleChange("gift", "receiverName", e.target.value)} />
          <input type="text" placeholder="Enter Location where gift is received" value={formData.gift.location} onChange={(e) => handleChange("gift", "location", e.target.value)} />
          <input type="text" placeholder="Type of Gift" value={formData.gift.giftType} onChange={(e) => handleChange("gift", "giftType", e.target.value)} />
          <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Submit'}</button>
        </div>
      )}

      {/* Rental */}
      {selectedType === "Rental Document" && (
        <div className="input-section">
          <h3 className="form-title">Enter Rental Document Details</h3>
          <input type="text" placeholder="Rent Amount" value={formData.rental.rentAmount} onChange={(e) => handleChange("rental", "rentAmount", e.target.value)} />
          <input type="date" placeholder="Start Date" value={formData.rental.startDate} onChange={(e) => handleDateChange("rental", "startDate", e)} />
          <input type="date" placeholder="End Date" value={formData.rental.endDate} onChange={(e) => handleDateChange("rental", "endDate", e)} />
          <input type="text" placeholder="Tenant Name" value={formData.rental.tenantName} onChange={(e) => handleChange("rental", "tenantName", e.target.value)} />
          <input type="text" placeholder="Landlord Name" value={formData.rental.landlordName} onChange={(e) => handleChange("rental", "landlordName", e.target.value)} />
          <input type="text" placeholder="Property Location" value={formData.rental.propertyLocation} onChange={(e) => handleChange("rental", "propertyLocation", e.target.value)} />
          <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Submit'}</button>
        </div>
      )}

      {/* Authority */}
      {selectedType === "Power of Authority" && (
        <div className="input-section">
          <h3 className="form-title">Enter Power of Authority Details</h3>
          <input type="text" placeholder="Grantor Name" value={formData.authority.grantorName} onChange={(e) => handleChange("authority", "grantorName", e.target.value)} />
          <input type="text" placeholder="Grantee Name" value={formData.authority.granteeName} onChange={(e) => handleChange("authority", "granteeName", e.target.value)} />
          <input type="text" placeholder="Authority Type" value={formData.authority.authorityType} onChange={(e) => handleChange("authority", "authorityType", e.target.value)} />
          <input type="date" placeholder="Validity Date" value={formData.authority.validity} onChange={(e) => handleDateChange("authority", "validity", e)} />
          <input type="text" placeholder="Location" value={formData.authority.location} onChange={(e) => handleChange("authority", "location", e.target.value)} />
          <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Submit'}</button>
        </div>
      )}
    </form>
  );
};

export default Uploads;