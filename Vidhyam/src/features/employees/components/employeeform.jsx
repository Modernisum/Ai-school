// EmployeeFormPage.jsx - FIXED Version - Complete Employee Form with Documents & Responsibilities
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Pencil, Upload, X, Plus, Trash2, Loader, CheckCircle, AlertTriangle,
  Save, CloudUpload, FileText, Edit3, User, MapPin, GraduationCap,
  Phone, BookOpen, FolderOpen, Eye, Check, Settings, ArrowLeft,
  Briefcase, DollarSign, CreditCard, Building, Badge, Trophy
} from "lucide-react";
import { callApiWithBackoff } from "../../../utils/api";

// --- API Configuration ---
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const MAX_RETRIES = 3;

// --- Document Schemas ---
const MANUAL_SCHEMAS = {
  aadhaar: ["name", "dob", "gender", "fatherName", "adharNumber", "residenceAddress"],
  pan: ["name", "fatherName", "panNumber", "dateOfBirth"],
  certificate: ["name", "instituteName", "courseName", "grade", "passingYear", "certificateNumber"],
  qualification: ["name", "degreeName", "instituteName", "passingYear", "grade"],
  joining: ["employeeName", "designation", "department", "joiningDate", "salary"],
  resume: ["name", "experience", "qualification", "skills", "previousCompany"],
  experience: ["employeeName", "designation", "company", "duration", "salary"],
  photo: [],
  other: ["documentName", "description", "issueDate"]
};

const REVERSE_DOC_MAPPING = {
  "aadhaar": "Aadhaar Card",
  "pan": "PAN Card",
  "certificate": "Degree Certificate",
  "qualification": "Qualification Document",
  "joining": "Joining Letter",
  "resume": "Resume/CV",
  "experience": "Experience Certificate",
  "photo": "Profile Photo",
  "other": "Other Document"
};

// **AUTO School ID Management**
const getSchoolIdFromStorage = () => {
  try {
    const possibleKeys = [
      'schoolId', 'school_id', 'currentSchoolId', 'selectedSchoolId', 'userSchoolId', 'SCHOOL_ID'
    ];
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
        return value.trim();
      }
    }
    const userData = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.schoolId) return parsed.schoolId;
        if (parsed.school_id) return parsed.school_id;
      } catch (e) { }
    }
    return null;
  } catch (error) {
    console.error('Error reading School ID from localStorage:', error);
    return null;
  }
};

const DEFAULT_SCHOOL_ID = "622079";

// Employee Types
const EMPLOYEE_TYPES = [
  { value: 'Teacher', label: 'Teacher', icon: GraduationCap },
  { value: 'Principal', label: 'Principal', icon: User },
  { value: 'Vice Principal', label: 'Vice Principal', icon: User },
  { value: 'Admin Staff', label: 'Admin Staff', icon: Building },
  { value: 'Peon', label: 'Peon', icon: User },
  { value: 'Security Guard', label: 'Security Guard', icon: Badge },
  { value: 'Librarian', label: 'Librarian', icon: BookOpen },
  { value: 'Lab Assistant', label: 'Lab Assistant', icon: User },
  { value: 'Sports Coach', label: 'Sports Coach', icon: Trophy },
  { value: 'Counselor', label: 'Counselor', icon: User }
];

// --- Helper Functions ---
const formatTimestamp = (date) => {
  if (!date) return 'N/A';
  const dateValue = date._seconds ? date._seconds * 1000 : date;
  const dateObj = new Date(dateValue);
  if (isNaN(dateObj)) return 'Invalid Date';
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const formatDocType = (friendlyName) => {
  const mapping = {
    "aadhaar card": "aadhaar",
    "pan card": "pan",
    "degree certificate": "certificate",
    "qualification document": "qualification",
    "joining letter": "joining",
    "resume/cv": "resume",
    "experience certificate": "experience",
    "profile photo": "photo",
    "other document": "other"
  };
  const lowerCaseName = friendlyName.toLowerCase();
  return mapping[lowerCaseName] || lowerCaseName.replace(/\s/g, '');
};

const getIndexByFriendlyName = (friendlyName, documentsArray) => {
  return documentsArray.findIndex(doc => doc.type === friendlyName);
};

// Initial state for all document slots
const initialDocuments = [
  { type: "Profile Photo", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
  {
    type: "Aadhaar Card",
    status: 'idle',
    extracted: null,
    front: { url: null, status: 'idle' },
    back: { url: null, status: 'idle' },
  },
  { type: "PAN Card", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
  { type: "Degree Certificate", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
  { type: "Qualification Document", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
  { type: "Joining Letter", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
  { type: "Resume/CV", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
  { type: "Experience Certificate", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
  { type: "Other Document", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() }
];

// --- AADHAAR DIALOG COMPONENT - Memoized ---
const AadhaarUploadDialog = memo(({ aadharData, onClose, onUpload }) => {
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const handleFileChange = (e, side) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file, side);
    }
    e.target.value = null;
  };

  const Uploader = ({ side, data }) => {
    const ref = side === 'front' ? frontInputRef : backInputRef;
    const title = side.charAt(0).toUpperCase() + side.slice(1);

    const borderStyle = data.status === 'uploading' ? 'border-yellow-500' :
      data.status === 'error' ? 'border-red-500' :
        data.status === 'uploaded' ? 'border-green-500' :
          'border-gray-400';

    return (
      <div className={`border-2 border-dashed rounded-lg p-4 text-center flex flex-col justify-center items-center h-48 ${borderStyle}`}>
        <h3 className="font-semibold mb-2 text-gray-700">{title} Side</h3>
        <input
          type="file"
          className="hidden"
          ref={ref}
          onChange={(e) => handleFileChange(e, side)}
          accept="image/*"
        />
        {data.status === 'idle' && (
          <div onClick={() => ref.current?.click()} className="cursor-pointer text-center p-2">
            <CloudUpload size={40} className="mx-auto text-blue-500 mb-2" />
            <p className="text-sm font-medium text-blue-600">Click to upload</p>
          </div>
        )}
        {data.status === 'uploading' && (
          <div className="text-center">
            <Loader size={40} className="mx-auto text-yellow-500 animate-spin" />
            <p className="text-sm mt-2">Uploading...</p>
          </div>
        )}
        {data.status === 'error' && (
          <div onClick={() => ref.current?.click()} className="cursor-pointer text-center p-2">
            <AlertTriangle size={40} className="mx-auto text-red-500 mb-2" />
            <p className="text-sm font-medium text-red-600">Upload failed. Click to retry.</p>
          </div>
        )}
        {data.status === 'uploaded' && data.url && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={data.url} alt={`${title} side preview`} className="max-w-full max-h-24 object-contain rounded-md" />
            <button
              onClick={() => ref.current?.click()}
              title="Replace image"
              className="absolute top-1 right-1 bg-white text-blue-600 p-1 rounded-full shadow-md hover:bg-blue-100 transition"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FileText className="mr-2" size={24} />
            Upload Aadhaar Card
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <Uploader side="front" data={aadharData.front} />
          <Uploader side="back" data={aadharData.back} />
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center justify-center"
        >
          <Check className="mr-2" size={18} />
          Done
        </button>
      </div>
    </div>
  );
});
AadhaarUploadDialog.displayName = 'AadhaarUploadDialog';

export default function EmployeeFormPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode'); // 'add' or 'edit'
  const employeeTypeFromUrl = queryParams.get('employeeType');
  const employeeIdFromUrl = queryParams.get('employeeId');

  // Auto-dismissal and dob state
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [sameAddress, setSameAddress] = useState(true);
  const [selectedEmployeeType, setSelectedEmployeeType] = useState(employeeTypeFromUrl || "");
  const [loadEmployeeId, setLoadEmployeeId] = useState(employeeIdFromUrl || "");
  const [documents, setDocuments] = useState(initialDocuments);

  // State to hold and manage all text/select inputs
  const [formFields, setFormFields] = useState({
    firstName: "",
    lastName: "",
    fatherName: "",
    motherName: "",
    gender: "",
    category: "",
    permanentAddress: "",
    temporaryAddress: "",
    qualification: "",
    experience: "",
    salary: "",
    joiningDate: "",
    department: "",
    designation: "",
    phone: "",
    email: "",
    emergencyContact: ""
  });

  // Memoized handler: Only recreated when setFormFields changes (never)
  const handleFieldChange = useCallback((field, value) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  }, []);

  // --- **AUTO SCHOOL ID STATE - No User Input** ---
  const [schoolId, setSchoolId] = useState("");
  const [schoolIdSource, setSchoolIdSource] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // --- API / BACKEND INTEGRATION STATE ---
  const [employeeData, setEmployeeData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingExisting, setIsFetchingExisting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  const [showDialog, setShowDialog] = useState(!mode || !employeeIdFromUrl); // Show dialog if no direct params
  const [isAadhaarDialogOpen, setIsAadhaarDialogOpen] = useState(false);

  // --- EDIT STATE FOR FORM SECTIONS ---
  const [editStates, setEditStates] = useState({
    basicDetails: mode === 'add',
    address: mode === 'add',
    professional: mode === 'add',
    contact: mode === 'add',
    documents: {}
  });

  // --- MANUAL DOCUMENT STATE ---
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [manualDocumentData, setManualDocumentData] = useState({});
  const [documentExists, setDocumentExists] = useState(false);
  const [isDocumentDataLoading, setIsDocumentDataLoading] = useState(false);
  const [isDocumentDataSaving, setIsDocumentDataSaving] = useState(false);
  const [isDocumentDataDeleting, setIsDocumentDataDeleting] = useState(false);

  // --- RESPONSIBILITY STATE ---
  const [responsibilityData, setResponsibilityData] = useState(null);
  const [allResponsibilities, setAllResponsibilities] = useState([]);
  const [selectedResponsibility, setSelectedResponsibility] = useState("");
  const [isLoadingResponsibilities, setIsLoadingResponsibilities] = useState(false);
  const [isAddingResponsibility, setIsAddingResponsibility] = useState(false);
  const [isRemovingResponsibility, setIsRemovingResponsibility] = useState(false);

  // **AUTO School ID Initialization**
  useEffect(() => {
    if (!API_BASE_URL) {
      setApiError("API_BASE_URL is not configured. Please check your environment variables (.env file).");
      return;
    }

    const initializeSchoolId = () => {
      const foundSchoolId = getSchoolIdFromStorage();

      if (foundSchoolId) {
        setSchoolId(foundSchoolId);
        setSchoolIdSource('localStorage');
        setApiSuccess(`School ID loaded: ${foundSchoolId}`);
      } else {
        setSchoolId(DEFAULT_SCHOOL_ID);
        setSchoolIdSource('default_fallback');
        setApiSuccess(`Using default School ID: ${DEFAULT_SCHOOL_ID}`);
      }

      setIsInitialized(true);
    };

    initializeSchoolId();
  }, []);

  // **Handle URL params after School ID is initialized**
  useEffect(() => {
    if (!isInitialized || !schoolId) return;

    if (mode === 'edit' && employeeIdFromUrl) {
      setLoadEmployeeId(employeeIdFromUrl);
      setShowDialog(false);
      setTimeout(() => {
        fetchEmployeeData(employeeIdFromUrl);
      }, 100);
    } else if (mode === 'add' && employeeTypeFromUrl) {
      setSelectedEmployeeType(employeeTypeFromUrl);
      setShowDialog(false);
      setTimeout(() => {
        createInitialEmployee(employeeTypeFromUrl);
      }, 100);
    }
  }, [isInitialized, schoolId, mode, employeeTypeFromUrl, employeeIdFromUrl]);

  // Auto dismiss messages
  useEffect(() => {
    if (apiSuccess) {
      const timer = setTimeout(() => setApiSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [apiSuccess]);

  useEffect(() => {
    if (apiError) {
      const timer = setTimeout(() => setApiError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [apiError]);

  // Tailwind utility for inputs
  const input = "mt-1 block w-full rounded-lg border-2 border-blue-500 px-3 py-2 shadow-sm transition-all duration-300 focus:border-blue-600 focus:ring focus:ring-blue-300";

  // Toggle edit state for form sections
  const toggleEditState = (section, docType = null) => {
    if (docType) {
      setEditStates(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [docType]: !prev.documents[docType]
        }
      }));
    } else {
      setEditStates(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    }
  };

  // Save individual section data
  const saveSection = async (section) => {
    if (!employeeData?.employeeId || !schoolId) {
      setApiError("Missing employee ID or school ID");
      return;
    }

    setIsSaving(true);
    try {
      const apiUrl = `${API_BASE_URL}/employees/${schoolId}/employees/${employeeData.employeeId}`;

      let updateData = {};
      if (section === 'basicDetails') {
        updateData = {
          firstName: formFields.firstName,
          lastName: formFields.lastName,
          fatherName: formFields.fatherName,
          motherName: formFields.motherName,
          gender: formFields.gender,
          dob: dob,
          category: formFields.category
        };
      } else if (section === 'professional') {
        updateData = {
          designation: formFields.designation,
          department: formFields.department,
          salary: formFields.salary,
          joiningDate: formFields.joiningDate,
          qualification: formFields.qualification,
          experience: formFields.experience
        };
      } else if (section === 'contact') {
        updateData = {
          phone: formFields.phone,
          email: formFields.email,
          emergencyContact: formFields.emergencyContact
        };
      } else if (section === 'address') {
        updateData = {
          permanentAddress: formFields.permanentAddress,
          temporaryAddress: sameAddress ? formFields.permanentAddress : formFields.temporaryAddress
        };
      }

      const result = await callApiWithBackoff(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (result.success) {
        setApiSuccess(`${section} updated successfully!`);
        setEditStates(prev => ({ ...prev, [section]: false }));
      } else {
        throw new Error(result.message || 'Failed to update employee data');
      }
    } catch (error) {
      setApiError(`Failed to save ${section}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Aadhaar side function
  const uploadAadhaarSide = async (file, side) => {
    if (!schoolId || !employeeData?.employeeId) {
      setApiError("Cannot upload document: Missing School ID or Employee ID.");
      return;
    }

    const docType = "aadhaar";
    const aadhaarIndex = documents.findIndex(doc => doc.type === "Aadhaar Card");
    if (aadhaarIndex === -1) return;

    const apiUrl = `${API_BASE_URL}/documentbox/${schoolId}/employees/${employeeData.employeeId}/documents`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    formData.append("side", side);

    console.log(`🔗 Aadhaar Upload: ${apiUrl} (${side} side)`);

    setDocuments(prev => prev.map((doc, i) => i === aadhaarIndex ? { ...doc, [side]: { ...doc[side], status: 'uploading' } } : doc));

    try {
      const response = await fetch(apiUrl, { method: 'POST', body: formData });
      console.log(`📡 Aadhaar Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Aadhaar Upload Failed: ${errorText.substring(0, 150)}`);
        throw new Error(`HTTP Error ${response.status}: ${errorText.substring(0, 150)}`);
      }
      const result = await response.json();

      if (result.status === "success") {
        setDocuments(prev => prev.map((doc, i) => {
          if (i === aadhaarIndex) {
            const updatedSide = { ...doc[side], status: 'uploaded', url: result.fileUrl };
            const newExtractedData = { ...(doc.extracted || {}), ...(result.data || {}) };
            const otherSide = side === 'front' ? 'back' : 'front';
            const isOtherSideUploaded = doc[otherSide].status === 'uploaded';
            const overallStatus = isOtherSideUploaded ? 'uploaded' : 'partial';
            return { ...doc, [side]: updatedSide, extracted: newExtractedData, status: overallStatus };
          }
          return doc;
        }));
        setApiSuccess(`Aadhaar ${side} side uploaded successfully.`);
        console.log(`✅ Aadhaar ${side} uploaded successfully`);
      } else {
        throw new Error(result.message || "Upload failed on server.");
      }
    } catch (error) {
      console.error(`❌ Aadhaar ${side} upload error:`, error);
      setDocuments(prev => prev.map((doc, i) => i === aadhaarIndex ? { ...doc, [side]: { ...doc[side], status: 'error' } } : doc));
      setApiError(`Failed to upload Aadhaar ${side} side. Error: ${error.message}`);
    }
  };

  // Upload document file
  const uploadDocumentFile = async (index, file) => {
    if (!schoolId || !employeeData?.employeeId) {
      setApiError("Cannot upload document: Missing School ID or Employee ID.");
      setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, status: 'error' } : doc));
      return;
    }

    const docTypeFriendly = documents[index].type;
    const docType = formatDocType(docTypeFriendly);

    const apiUrl = `${API_BASE_URL}/documentbox/${schoolId}/employees/${employeeData.employeeId}/documents`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);

    console.log(`🔗 Document Upload: ${apiUrl} (${docTypeFriendly} -> ${docType})`);

    setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, status: 'uploading' } : doc));

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        if (i > 0) {
          const delay = Math.pow(2, i) * 1000;
          console.log(`⏳ Document Upload Retry ${i} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const response = await fetch(apiUrl, { method: 'POST', body: formData });
        console.log(`📡 Document Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Document Upload Failed: ${errorText.substring(0, 100)}`);
          throw new Error(`HTTP Error ${response.status}: ${errorText.substring(0, 100)}...`);
        }

        const result = await response.json();

        if (result.status === "success") {
          const isImageLike = ['photo'].includes(docType) || file.type.startsWith('image/');
          setDocuments(prev => prev.map((doc, k) =>
            k === index
              ? {
                ...doc,
                file: file,
                preview: isImageLike ? (result.fileUrl || URL.createObjectURL(file)) : null,
                status: 'uploaded',
                url: result.fileUrl,
                documentType: result.documentType,
                extracted: result.extractedData
              }
              : doc
          ));
          setApiSuccess(`${documents[index].type} uploaded successfully.`);
          console.log(`✅ ${docTypeFriendly} uploaded successfully`);

          if (selectedDocumentType === docType) {
            setManualDocumentData(result.extractedData || {});
            setDocumentExists(true);
          }
          return;
        } else {
          throw new Error(result.message || "Upload failed on server.");
        }
      } catch (error) {
        console.error(`❌ Document Upload Attempt ${i + 1} failed:`, error);
        if (i === MAX_RETRIES - 1) {
          setDocuments(prev => prev.map((doc, k) => k === index ? { ...doc, status: 'error' } : doc));
          setApiError(`Failed to upload ${documents[index].type}. Error: ${error.message}`);
        }
      }
    }
  };

  const handleFileChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadDocumentFile(index, file);
  };

  const handleDocumentSlotClick = (index) => {
    const doc = documents[index];
    if (!employeeData) {
      setApiError("Please start a new employee registration or load an existing employee before uploading documents.");
      return;
    }

    if (doc.type === "Aadhaar Card") {
      setIsAadhaarDialogOpen(true);
    } else if (doc.inputRef?.current) {
      doc.inputRef.current.click();
    }
  };

  // Fetch all documents data
  const fetchAllDocumentsData = async (employeeIdValue) => {
    if (!schoolId || !employeeIdValue) return;

    const apiUrl = `${API_BASE_URL}/documentbox/${schoolId}/employees/${employeeIdValue}/documents`;
    console.log(`🔗 Fetching Documents: ${apiUrl}`);
    setApiError(null);

    try {
      const result = await callApiWithBackoff(apiUrl, { method: 'GET' });

      if (result.status === "success" && result.documents) {
        const fetchedDocuments = result.documents;
        setDocuments(prevDocs => {
          let newDocs = [...prevDocs];

          Object.entries(fetchedDocuments).forEach(([docTypeKey, docData]) => {
            const friendlyName = REVERSE_DOC_MAPPING[docTypeKey];
            if (friendlyName) {
              const index = getIndexByFriendlyName(friendlyName, newDocs);
              if (index !== -1) {
                if (docTypeKey === 'aadhaar') {
                  const frontUrl = docData.frontUrl || docData.fileUrl || null;
                  const backUrl = docData.backUrl || null;
                  let status = 'idle';
                  if (frontUrl && backUrl) status = 'uploaded';
                  else if (frontUrl || backUrl) status = 'partial';

                  newDocs[index] = {
                    ...newDocs[index],
                    status: status,
                    extracted: docData,
                    front: { ...newDocs[index].front, url: frontUrl, status: frontUrl ? 'uploaded' : 'idle' },
                    back: { ...newDocs[index].back, url: backUrl, status: backUrl ? 'uploaded' : 'idle' },
                  };
                } else {
                  const fileUrl = docData.fileUrl || null;
                  const isImageLike = ['photo'].includes(docTypeKey);
                  newDocs[index] = {
                    ...newDocs[index],
                    status: fileUrl ? 'uploaded' : 'metadata_found',
                    url: fileUrl,
                    documentType: docData.documentType,
                    extracted: docData,
                    preview: fileUrl && isImageLike ? fileUrl : null,
                  };
                }
              }
            }
          });

          return newDocs;
        });
        setApiSuccess(`Found data for ${Object.keys(fetchedDocuments).length} documents.`);
      } else {
        setApiSuccess("No prior document data found.");
      }
    } catch (error) {
      setApiError(`Failed to fetch initial document list: ${error.message}`);
    }
  };

  // Load employee responsibilities
  const loadEmployeeResponsibilities = async (employeeIdValue) => {
    if (!schoolId || !employeeIdValue) return;

    setIsLoadingResponsibilities(true);
    try {
      const apiUrl = `${API_BASE_URL}/responsibility/${schoolId}/employees/${employeeIdValue}`;
      const result = await callApiWithBackoff(apiUrl);
      if (result.success && result.employee) {
        setResponsibilityData(result.employee);
        setApiSuccess(`Employee responsibilities loaded: ${result.employee.responsibilities?.length || 0} responsibilities found.`);
      }
    } catch (error) {
      console.error("Failed to load employee responsibilities:", error);
    } finally {
      setIsLoadingResponsibilities(false);
    }
  };

  // Load all available responsibilities
  const loadAllResponsibilities = async () => {
    if (!schoolId) return;

    try {
      const apiUrl = `${API_BASE_URL}/responsibility/${schoolId}/responsibilities`;
      const result = await callApiWithBackoff(apiUrl);
      if (result.success && Array.isArray(result.responsibilities)) {
        setAllResponsibilities(result.responsibilities);
      }
    } catch (error) {
      console.error("Failed to load all responsibilities:", error);
    }
  };

  // FIXED: Add responsibility to employee with correct API endpoint
  const addResponsibilityToEmployee = async () => {
    if (!selectedResponsibility || !employeeData?.employeeId || !schoolId) return;

    setIsAddingResponsibility(true);
    setApiError(null);

    try {
      // FIXED: Use the correct API endpoint from your working example
      const apiUrl = `${API_BASE_URL}/responsibility/${schoolId}/employees/${employeeData.employeeId}/responsibilities`;
      const result = await callApiWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsibilityId: selectedResponsibility })
      });

      if (result.success) {
        setApiSuccess(result.message || "Responsibility added successfully");
        setSelectedResponsibility("");
        loadEmployeeResponsibilities(employeeData.employeeId);
      } else {
        setApiError(result.message || "Failed to add responsibility");
      }
    } catch (error) {
      setApiError(`Failed to add responsibility: ${error.message}`);
    } finally {
      setIsAddingResponsibility(false);
    }
  };

  // FIXED: Remove responsibility from employee with correct API endpoint
  const removeResponsibilityFromEmployee = async (responsibilityId) => {
    if (!responsibilityId || !employeeData?.employeeId || !schoolId) return;

    setIsRemovingResponsibility(true);
    try {
      // FIXED: Use the correct API endpoint
      const apiUrl = `${API_BASE_URL}/responsibility/${schoolId}/employees/${employeeData.employeeId}/responsibilities/${responsibilityId}`;
      const result = await callApiWithBackoff(apiUrl, { method: 'DELETE' });

      if (result.success) {
        setApiSuccess("Responsibility removed successfully");
        loadEmployeeResponsibilities(employeeData.employeeId);
      } else {
        setApiError("Failed to remove responsibility");
      }
    } catch (error) {
      setApiError(`Failed to remove responsibility: ${error.message}`);
    } finally {
      setIsRemovingResponsibility(false);
    }
  };

  // Employee API Handlers
  const createInitialEmployee = async (employeeType) => {
    if (!schoolId) {
      setApiError("School ID not available. Please refresh the page.");
      return;
    }

    setIsLoading(true); setApiError(null);
    const apiUrl = `${API_BASE_URL}/employees/${schoolId}/employees`;
    // Backend expects `name` and `role` (CreateEmployeeRequest). Provide a sensible default name and the role.
    const requestBody = { name: `${employeeType} - New`, role: employeeType };

    try {
      console.log(`📝 Creating employee with type: ${employeeType}, School ID: ${schoolId}`);
      const result = await callApiWithBackoff(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (result.success && result.employee) {
        setEmployeeData(result.employee);
        setShowDialog(false);
        setApiSuccess(`New employee ID ${result.employee.employeeId} created. Please fill out the form and Save.`);

        // Load responsibilities after creating employee
        loadAllResponsibilities();
        loadEmployeeResponsibilities(result.employee.employeeId);
      } else {
        throw new Error(result.message || 'Unknown application error occurred during POST operation.');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      setApiError(`Failed to create employee: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeData = async (employeeIdValue) => {
    if (!schoolId) {
      setApiError("School ID not available. Please refresh the page.");
      return;
    }

    setIsFetchingExisting(true); setApiError(null);
    const apiUrl = `${API_BASE_URL}/employees/${schoolId}/employees/${employeeIdValue}`;

    try {
      console.log(`📖 Fetching employee data from: ${apiUrl}`);
      const result = await callApiWithBackoff(apiUrl, { method: 'GET' });
      console.log('Employee data response:', result);

      if (result.success && result.employee) {
        const data = result.employee;
        setEmployeeData(data);

        // **COMPLETE Field Population**
        console.log('Populating form fields from employee data:', data);

        setFormFields(prev => ({
          ...prev,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          fatherName: data.fatherName || "",
          motherName: data.motherName || "",
          gender: data.gender || "",
          category: data.category || "",
          permanentAddress: data.permanentAddress || data.address || "",
          temporaryAddress: data.temporaryAddress || data.currentAddress || "",
          qualification: data.qualification || "",
          experience: data.experience || "",
          salary: data.salary || "",
          joiningDate: data.joiningDate || "",
          department: data.department || "",
          designation: data.designation || "",
          phone: data.phone || data.phoneNumber || "",
          email: data.email || data.emailAddress || "",
          emergencyContact: data.emergencyContact || ""
        }));

        // Set DOB and calculate age
        if (data.dateOfBirth || data.dob) {
          const dobValue = data.dateOfBirth || data.dob;
          setDob(dobValue);
          handleDobChange({ target: { value: dobValue } });
        }

        // Set address checkbox state
        if (data.temporaryAddress && data.permanentAddress) {
          setSameAddress(data.temporaryAddress === data.permanentAddress);
        }

        await fetchAllDocumentsData(employeeIdValue);

        // Load responsibilities
        loadAllResponsibilities();
        loadEmployeeResponsibilities(employeeIdValue);

        setShowDialog(false);
        setApiSuccess(`Employee ${employeeIdValue} data loaded successfully.`);
      } else {
        throw new Error(result.message || 'Employee not found in database.');
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setApiError(`Failed to load employee data: ${error.message}`);
    } finally {
      setIsFetchingExisting(false);
    }
  };

  // Manual Document API handlers
  const getDocumentApiUrl = useCallback((docType) => {
    if (!schoolId || !employeeData?.employeeId || !docType) return null;
    return `${API_BASE_URL}/documentbox/${schoolId}/employees/${employeeData.employeeId}/documents/${docType}`;
  }, [schoolId, employeeData?.employeeId]);

  const fetchDocumentData = useCallback(async (docType) => {
    const apiUrl = getDocumentApiUrl(docType);
    if (!apiUrl) return;

    setIsDocumentDataLoading(true);
    setApiError(null);
    setDocumentExists(false);
    setManualDocumentData({});

    const friendlyName = REVERSE_DOC_MAPPING[docType];
    const docSlotIndex = friendlyName ? getIndexByFriendlyName(friendlyName, documents) : -1;
    const initialExtractedData = docSlotIndex !== -1 ? documents[docSlotIndex].extracted : null;

    try {
      const result = await callApiWithBackoff(apiUrl, { method: 'GET' });

      if (result.status === "success" && result.data) {
        setManualDocumentData(result.data);
        setDocumentExists(true);
        setApiSuccess(`${docType} data loaded from database.`);
      } else {
        throw new Error(result.message || "Failed to parse document data.");
      }

    } catch (error) {
      if (error.message.includes("404") || error.message.toLowerCase().includes("not found")) {
        if (initialExtractedData) {
          setManualDocumentData(initialExtractedData);
          setDocumentExists(false);
          setApiSuccess(`${docType} record not found, pre-populating with file extraction data.`);
        } else {
          setManualDocumentData({});
          setDocumentExists(false);
          setApiSuccess(`${docType} document entry not found. Ready to create a new one.`);
        }
      } else {
        setApiError(`Failed to fetch ${docType} data: ${error.message}`);
      }
    } finally {
      setIsDocumentDataLoading(false);
    }
  }, [getDocumentApiUrl, documents]);

  const saveDocumentData = async () => {
    const docType = selectedDocumentType;
    const apiUrl = getDocumentApiUrl(docType);
    if (!apiUrl) { setApiError("Missing configuration for API call."); return; }

    setIsDocumentDataSaving(true);
    setApiError(null);

    const method = documentExists ? 'PUT' : 'POST';

    try {
      const result = await callApiWithBackoff(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: manualDocumentData }),
      });

      if (result.status === "success" && result.data) {
        setManualDocumentData(result.data);
        setDocumentExists(true);
        setApiSuccess(`${docType} data ${method === 'PUT' ? 'updated' : 'added'} successfully.`);
      } else {
        throw new Error(result.message || 'Unknown save error.');
      }
      await fetchAllDocumentsData(employeeData.employeeId);

    } catch (error) {
      setApiError(`Failed to save ${docType} data: ${error.message}`);
    } finally {
      setIsDocumentDataSaving(false);
    }
  };

  const deleteDocumentData = async () => {
    const docType = selectedDocumentType;
    const apiUrl = getDocumentApiUrl(docType);
    if (!apiUrl) { setApiError("Missing configuration for API call."); return; }

    if (!window.confirm(`Are you sure you want to delete the ${docType} record? This action is permanent.`)) return;

    setIsDocumentDataDeleting(true);
    setApiError(null);

    try {
      const result = await callApiWithBackoff(apiUrl, { method: 'DELETE' });

      if (result.status === "success" && result.message) {
        setManualDocumentData({});
        setDocumentExists(false);
        setApiSuccess(result.message);
      } else {
        throw new Error(result.message || 'Unknown delete error.');
      }
      await fetchAllDocumentsData(employeeData.employeeId);

    } catch (error) {
      setApiError(`Failed to delete ${docType} data: ${error.message}`);
    } finally {
      setIsDocumentDataDeleting(false);
    }
  };

  useEffect(() => {
    if (employeeData?.employeeId && selectedDocumentType) {
      fetchDocumentData(selectedDocumentType);
    } else {
      setManualDocumentData({});
      setDocumentExists(false);
    }
  }, [selectedDocumentType, employeeData?.employeeId, fetchDocumentData]);

  // Event handlers
  const handleBack = () => {
    navigate('/dashboard/employee');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard/home');
  };

  const handleViewProfile = () => {
    if (employeeData?.employeeId) {
      navigate(`/dashboard/employeeprofile?employeeId=${employeeData.employeeId}`);
    }
  };

  const handleContinueNew = () => {
    if (selectedEmployeeType) {
      createInitialEmployee(selectedEmployeeType);
    } else {
      setApiError("Please select an employee type for new registration.");
    }
  };

  const handleContinueExisting = () => {
    if (loadEmployeeId) {
      fetchEmployeeData(loadEmployeeId);
    } else {
      setApiError("Please enter an Employee ID to load existing data.");
    }
  };

  const handleFormChange = (field, value) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  };

  const handleDobChange = (e) => {
    const value = e.target.value;
    setDob(value);
    const birthDate = new Date(value);
    if (!isNaN(birthDate)) {
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { years--; }
      setAge(years);
    }
  };

  // Component for displaying existing documents
  const DocumentDisplayContainer = ({ doc, index }) => {
    const docType = formatDocType(doc.type);
    const isEditing = editStates.documents[docType];
    const fields = MANUAL_SCHEMAS[docType] || [];
    const [localData, setLocalData] = useState(doc.extracted || {});

    useEffect(() => {
      setLocalData(doc.extracted || {});
    }, [doc.extracted]);

    if (!doc.extracted && !doc.url && doc.status === 'idle') return null;

    const handleLocalDataChange = (field, value) => {
      setLocalData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
      setIsDocumentDataSaving(true);
      try {
        // Simulate API call to save this specific document
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the document in the main documents state
        setDocuments(prev => prev.map((d, i) =>
          i === index ? { ...d, extracted: localData } : d
        ));

        setApiSuccess(`${doc.type} data updated successfully!`);
        toggleEditState('documents', docType);
      } catch (error) {
        setApiError(`Failed to save ${doc.type} data`);
      } finally {
        setIsDocumentDataSaving(false);
      }
    };

    return (
      <div className="bg-white border border-gray-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <FileText className="mr-2 text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-800">{doc.type}</h3>
            {doc.status === 'uploaded' && <CheckCircle className="ml-2 text-green-600" size={16} />}
          </div>
          <div className="flex items-center gap-2">
            {doc.url && (
              <button
                onClick={() => window.open(doc.url, '_blank')}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition"
                title="View file"
              >
                <Eye size={16} />
              </button>
            )}
            <button
              onClick={() => toggleEditState('documents', docType)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition"
              title={isEditing ? "Cancel edit" : "Edit"}
            >
              {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            </button>
          </div>
        </div>

        {/* Document preview/info */}
        <div className="mb-3">
          {doc.preview && (
            <img src={doc.preview} alt={doc.type} className="h-20 w-32 object-cover rounded-md mb-2" />
          )}
          {doc.extracted && (
            <div className="text-sm text-gray-600 space-y-1">
              {doc.extracted.name && <p><span className="font-medium">Name:</span> {doc.extracted.name}</p>}
              {doc.extracted.employeeName && <p><span className="font-medium">Employee:</span> {doc.extracted.employeeName}</p>}
              {doc.extracted.dob && <p><span className="font-medium">DOB:</span> {doc.extracted.dob}</p>}
              {doc.extracted.panNumber && <p><span className="font-medium">PAN:</span> {doc.extracted.panNumber}</p>}
            </div>
          )}
        </div>

        {/* Editable fields */}
        {isEditing && fields.length > 0 && (
          <div className="border-t pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {fields.map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <input
                    type={field.toLowerCase().includes('date') || field.toLowerCase().includes('dob') ? 'date' : 'text'}
                    value={localData[field] || ''}
                    onChange={(e) => handleLocalDataChange(field, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={isDocumentDataSaving}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isDocumentDataSaving}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isDocumentDataSaving ? (
                  <Loader className="mr-1 animate-spin" size={14} />
                ) : (
                  <Save className="mr-1" size={14} />
                )}
                {isDocumentDataSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Responsibilities Section Component
  const ResponsibilitiesSection = () => {
    if (isLoadingResponsibilities) {
      return (
        <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6 mb-6">
          <div className="py-6 flex items-center justify-center text-gray-600">
            <Loader className="animate-spin mr-2" size={20} />
            Loading responsibilities...
          </div>
        </div>
      );
    }

    if (!responsibilityData) {
      return (
        <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
            <Briefcase className="mr-2 text-green-600" size={20} />
            Employee Responsibilities & Salary
          </h2>
          <div className="text-center py-8">
            <p className="text-gray-600">No responsibility data available.</p>
            <p className="text-gray-500 text-sm">Employee responsibilities will appear here once loaded.</p>
          </div>
        </div>
      );
    }

    // Get available responsibilities (not already assigned)
    const assignedResponsibilityIds = responsibilityData?.responsibilities?.map(r => r.id) || [];
    const availableResponsibilities = allResponsibilities.filter(resp =>
      !assignedResponsibilityIds.includes(resp.id)
    );

    return (
      <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 border-2 border-green-200 rounded-xl shadow-xl p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
          <Briefcase className="mr-2 text-green-600" size={20} />
          Employee Responsibilities & Salary
        </h2>

        {/* Salary Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">Total Per Day Price</p>
                <p className="text-2xl font-bold text-blue-800">{formatCurrency(responsibilityData?.totalPerDayPrice || 0)}</p>
              </div>
              <DollarSign size={24} className="text-blue-600" />
            </div>
          </div>

          <div className="bg-green-100 border border-green-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">Monthly Base Salary</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(responsibilityData?.baseSalary || 0)}</p>
              </div>
              <CreditCard size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Add Responsibility Section */}
        {availableResponsibilities.length > 0 && (
          <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Add New Responsibility</h3>
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Responsibility</label>
                <select
                  className="w-full border-2 border-blue-200 px-3 py-2 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  value={selectedResponsibility}
                  onChange={(e) => setSelectedResponsibility(e.target.value)}
                >
                  <option value="">-- Select Responsibility --</option>
                  {availableResponsibilities.map(resp => (
                    <option key={resp.id} value={resp.id}>
                      {resp.name} - {formatCurrency(resp.perDayPrice)}/day ({resp.timePeriod}h)
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={addResponsibilityToEmployee}
                disabled={!selectedResponsibility || isAddingResponsibility}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
              >
                {isAddingResponsibility ? (
                  <>
                    <Loader size={16} className="animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Add
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Current Responsibilities */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Current Responsibilities ({responsibilityData?.responsibilities?.length || 0})
          </h3>

          {!responsibilityData?.responsibilities || responsibilityData.responsibilities.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No responsibilities assigned</p>
              <p className="text-gray-500 text-sm">Add responsibilities to calculate salary</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responsibilityData.responsibilities.map((responsibility, index) => (
                <div key={responsibility.id || index} className="bg-white border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h4 className="font-semibold text-gray-800 text-lg">{responsibility.name}</h4>
                        <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {responsibility.spaceCategory}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Field:</span>
                          <p className="font-medium">{responsibility.responsibilityField}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Space:</span>
                          <p className="font-medium">{responsibility.spaceId}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Daily Rate:</span>
                          <p className="font-medium text-green-600">{formatCurrency(responsibility.perDayPrice)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Time Period:</span>
                          <p className="font-medium">{responsibility.timePeriod} hours/day</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeResponsibilityFromEmployee(responsibility.id)}
                      disabled={isRemovingResponsibility}
                      className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove Responsibility"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                    Added: {formatTimestamp(responsibility.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Error and Success components
  const ErrorDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100] p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-[90%] max-w-md border-4 border-red-500">
        <div className="flex items-center mb-4">
          <AlertTriangle size={30} className="text-red-600 mr-3" />
          <h2 className="text-xl font-bold text-red-700">API Error</h2>
        </div>
        <p className="text-gray-700 mb-6 border-l-4 border-red-300 pl-3 py-1 bg-red-50 text-sm">
          {apiError}
        </p>
        <button onClick={() => setApiError(null)} className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition flex items-center justify-center">
          <X className="mr-2" size={18} />
          Close
        </button>
      </div>
    </div>
  );

  const SuccessNotification = () => (
    <div className="fixed top-4 right-4 z-[100] p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg shadow-lg flex items-center max-w-sm">
      <CheckCircle size={24} className="mr-3" />
      <p className="font-medium text-sm">{apiSuccess}</p>
      <button onClick={() => setApiSuccess(null)} className="ml-4 text-green-500 hover:text-green-700">
        <X size={20} />
      </button>
    </div>
  );

  // Show loading while initializing
  if (!isInitialized || isLoading || isFetchingExisting) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size={48} className="animate-spin text-blue-600" />
        <div className="ml-4 text-center">
          <p className="text-lg font-medium">
            {!isInitialized ? 'Initializing system...' :
              isLoading ? 'Creating employee record...' :
                'Loading complete employee data...'}
          </p>
          {schoolId && (
            <p className="text-sm text-gray-600 mt-1">School ID: {schoolId}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center p-4 bg-gradient-to-b from-blue-50 to-red-50 min-h-screen">
      {apiError && <ErrorDialog />}
      {apiSuccess && <SuccessNotification />}
      {isAadhaarDialogOpen && (
        <AadhaarUploadDialog
          aadharData={documents.find(doc => doc.type === 'Aadhaar Card')}
          onClose={() => setIsAadhaarDialogOpen(false)}
          onUpload={uploadAadhaarSide}
        />
      )}

      {/* Header with automatic School ID display */}
      <div className="w-full max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
            <button
              onClick={handleBack}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <ArrowLeft className="mr-2" size={20} />
              Back to Employee Page
            </button>
          </div>

          {employeeData && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleViewProfile}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 text-sm"
              >
                <Eye className="mr-2" size={16} />
                View Profile
              </button>
            </div>
          )}

          <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <span>School ID: <span className="font-bold text-blue-600">{schoolId}</span></span>
              <span className="mx-2">|</span>
              <span className="text-green-600">
                {schoolIdSource === 'localStorage' ? '✅ From Storage' : '⚠️ Default'}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Complete Employee Management System
            </div>
          </div>
        </div>
      </div>

      {/* Initialization Dialog */}
      {showDialog && !apiError && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-gradient-to-r from-blue-100 via-white to-red-100 p-8 rounded-xl shadow-xl w-[90%] max-w-[500px] text-center">
            <h2 className="text-2xl font-bold text-blue-700 mb-6 flex items-center justify-center">
              <Settings className="mr-2" size={28} />
              Employee Registration
            </h2>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">
              School ID: <span className="font-semibold text-blue-600">{schoolId}</span>
              {schoolIdSource === 'default_fallback' && <span className="text-orange-600 ml-2">(Default)</span>}
            </p>

            <div className="mb-8 p-4 border-2 border-dashed border-blue-400 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-600 mb-3 flex items-center justify-center">
                <User className="mr-2" size={20} />
                New Employee Registration
              </h3>
              <select value={selectedEmployeeType} onChange={(e) => setSelectedEmployeeType(e.target.value)} className="w-full rounded-lg border-2 border-blue-500 px-3 py-2 shadow-sm mb-4 focus:border-blue-600 focus:ring focus:ring-blue-300">
                <option value="">-- Select Employee Type --</option>
                {EMPLOYEE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <button disabled={!selectedEmployeeType || isLoading || !schoolId || isFetchingExisting || isSaving} onClick={handleContinueNew} className="w-full px-6 py-2 bg-gradient-to-r from-blue-500 to-red-500 text-white font-semibold rounded-lg shadow hover:scale-105 transition disabled:opacity-50 flex items-center justify-center">
                {isLoading ? (<><Loader size={20} className="mr-2 animate-spin" /> Creating...</>) : (<><Plus className="mr-2" size={20} />Start New Registration</>)}
              </button>
            </div>

            <div className="p-4 border-2 border-dashed border-red-400 rounded-lg">
              <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center justify-center">
                <FolderOpen className="mr-2" size={20} />
                Load Existing Employee
              </h3>
              <input type="text" placeholder="Enter Employee ID (e.g., EMP003)" value={loadEmployeeId} onChange={(e) => setLoadEmployeeId(e.target.value)} className="w-full rounded-lg border-2 border-red-500 px-3 py-2 shadow-sm mb-4 focus:border-red-600 focus:ring focus:ring-red-300" />
              <button disabled={!loadEmployeeId || isFetchingExisting || isLoading || !schoolId || isSaving} onClick={handleContinueExisting} className="w-full px-6 py-2 bg-gradient-to-r from-red-500 to-yellow-500 text-white font-semibold rounded-lg shadow hover:scale-105 transition disabled:opacity-50 flex items-center justify-center">
                {isFetchingExisting ? (<><Loader size={20} className="mr-2 animate-spin" /> Loading...</>) : (<><Upload className="mr-2" size={20} />Load Employee Data</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      {employeeData && (
        <div className="w-full max-w-7xl">
          <h1 className="text-3xl font-bold mb-6 text-blue-700 text-center flex items-center justify-center">
            <User className="mr-3" size={32} />
            Employee Management: {employeeData.employeeId}
          </h1>

          {/* Employee Core Data Display */}
          <div className="w-full p-4 mb-6 rounded-xl border-4 border-dashed border-green-500 bg-green-50 shadow-inner">
            <h2 className="text-xl font-bold text-green-700 mb-2 flex items-center">
              <CheckCircle size={24} className="mr-2" /> Core Employee Data
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm font-medium text-gray-700">
              <p>ID: <span className="font-bold text-blue-600">{employeeData.employeeId}</span></p>
              <p>Type: <span className="font-bold text-blue-600">{employeeData.employeeType}</span></p>
              <p>School: <span className="font-bold text-green-600">{schoolId}</span></p>
              <p>Created: <span className="font-bold text-blue-600">{formatTimestamp(employeeData.createdAt)}</span></p>
            </div>
          </div>

          {/* Responsibilities Section */}
          <ResponsibilitiesSection />

          {/* Layout: 2 columns for better space utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Column */}
            <div className="space-y-6">

              {/* Document Upload Section */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
                  <CloudUpload className="mr-2" size={20} />
                  Document Upload
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {documents.map((doc, idx) => {
                    if (doc.type === "Aadhaar Card") {
                      let borderColorClass = 'border-blue-500 bg-white';
                      if (doc.status === 'uploaded') borderColorClass = 'border-green-500 bg-green-50';
                      else if (doc.status === 'partial') borderColorClass = 'border-yellow-500 bg-yellow-50';
                      else if (doc.front.status === 'error' || doc.back.status === 'error') borderColorClass = 'border-red-500 bg-red-50';

                      return (
                        <div
                          key={idx}
                          className={`flex flex-col items-center justify-between relative h-32 rounded-lg shadow-md overflow-hidden transition-all duration-300 border-2 cursor-pointer ${borderColorClass}`}
                          onClick={() => handleDocumentSlotClick(idx)}
                        >
                          <div className="flex flex-col justify-center items-center h-full w-full p-2 text-center">
                            {doc.front.url ? (
                              <img src={doc.front.url} alt="Aadhaar Front" className="h-12 w-full object-contain mb-1" />
                            ) : (
                              <Pencil size={20} className="text-blue-600 mb-1" />
                            )}
                            <div className="text-xs mt-1 w-full text-center border-t pt-1">
                              <p className={`font-semibold capitalize text-xs ${doc.front.status === 'uploaded' ? 'text-green-700' : 'text-gray-500'}`}>Front: {doc.front.status}</p>
                              <p className={`font-semibold capitalize text-xs ${doc.back.status === 'uploaded' ? 'text-green-700' : 'text-gray-500'}`}>Back: {doc.back.status}</p>
                            </div>
                          </div>
                          <p className="text-xs font-medium py-1 w-full text-center border-t border-gray-300 bg-white">{doc.type}</p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center relative h-32 rounded-lg shadow-md overflow-hidden transition-all duration-300 cursor-pointer
                            ${doc.status === 'uploaded' ? 'border-2 border-green-500 bg-green-50' :
                            doc.status === 'metadata_found' ? 'border-2 border-purple-500 bg-purple-50' :
                              doc.status === 'error' ? 'border-2 border-red-500 bg-red-50' :
                                doc.status === 'uploading' ? 'border-2 border-yellow-500 bg-yellow-50 animate-pulse' :
                                  'border border-blue-500 bg-white hover:shadow-lg'
                          }`}
                        onClick={() => handleDocumentSlotClick(idx)}
                      >
                        <input id={`file-${idx}`} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileChange(e, idx)} ref={doc.inputRef} onClick={(e) => e.stopPropagation()} />
                        <div className="flex flex-col justify-center items-center h-full w-full p-2">
                          {doc.status === 'uploading' ? (
                            <div className="text-center"><Loader size={20} className="text-yellow-600 animate-spin mb-2" /><p className="text-xs font-medium text-gray-700">Uploading...</p></div>
                          ) : doc.status === 'error' ? (
                            <div className="text-center"><AlertTriangle size={20} className="text-red-600 mb-2" /><p className="text-xs font-medium text-gray-700">Error</p></div>
                          ) : (doc.url || doc.status === 'metadata_found') ? (
                            <div className="text-center w-full">
                              {doc.preview ? (
                                <img src={doc.preview} alt={doc.type} className="h-12 w-full object-contain mb-1" />
                              ) : doc.url ? (
                                <div className="h-12 flex items-center justify-center bg-gray-200 w-full rounded-lg"><FileText size={20} className="text-gray-600" /></div>
                              ) : (
                                <div className="h-12 flex items-center justify-center bg-purple-100 w-full rounded-lg"><Pencil size={20} className="text-purple-600" /></div>
                              )}
                              <p className={`text-xs font-semibold mt-1 text-center ${doc.url ? 'text-green-700' : 'text-purple-700'}`}>{doc.url ? 'Uploaded' : 'Metadata'}</p>
                            </div>
                          ) : (
                            <div className="text-center"><CloudUpload size={20} className="text-blue-600 mb-1" /><span className="text-xs text-gray-600 mt-1">Upload</span></div>
                          )}
                        </div>
                        <p className="text-xs font-medium py-1 w-full text-center border-t border-gray-300 bg-white truncate">{doc.type}</p>
                        {doc.url && (
                          <button className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-700 z-10 text-xs" onClick={(e) => { e.stopPropagation(); setDocuments(prev => prev.map((d, i) => i === idx ? { ...initialDocuments.find(initDoc => initDoc.type === d.type) } : d)); }}>
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Existing Documents Display */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
                  <FileText className="mr-2" size={20} />
                  Existing Documents
                </h2>
                <div className="space-y-4">
                  {documents.filter(doc => doc.extracted || doc.url).length > 0 ? (
                    documents.map((doc, index) => (
                      <DocumentDisplayContainer key={index} doc={doc} index={index} />
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No documents found. Upload documents to see them here.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Basic Details */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-blue-600 flex items-center">
                    <User className="mr-2" size={20} />
                    Basic Details
                  </h2>
                  <button
                    onClick={() => editStates.basicDetails ? saveSection('basicDetails') : toggleEditState('basicDetails')}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    disabled={isSaving}
                  >
                    {editStates.basicDetails ? (
                      <>
                        {isSaving ? <Loader className="mr-1 animate-spin" size={14} /> : <Save className="mr-1" size={14} />}
                        {isSaving ? 'Saving...' : 'Save'}
                      </>
                    ) : (
                      <>
                        <Edit3 className="mr-1" size={14} />
                        Edit
                      </>
                    )}
                  </button>
                </div>

                {editStates.basicDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" value={formFields.firstName} onChange={(e) => handleFormChange('firstName', e.target.value)} className={input} />
                    <input type="text" placeholder="Last Name" value={formFields.lastName} onChange={(e) => handleFormChange('lastName', e.target.value)} className={input} />
                    <input type="date" value={dob} onChange={handleDobChange} className={input} />
                    <input type="text" placeholder="Age" value={age} readOnly className={`${input} bg-gray-100`} />
                    <input type="text" placeholder="Father's Name" value={formFields.fatherName} onChange={(e) => handleFormChange('fatherName', e.target.value)} className={input} />
                    <input type="text" placeholder="Mother's Name" value={formFields.motherName} onChange={(e) => handleFormChange('motherName', e.target.value)} className={input} />
                    <select value={formFields.gender} onChange={(e) => handleFormChange('gender', e.target.value)} className={input}>
                      <option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option>
                    </select>
                    <select value={formFields.category} onChange={(e) => handleFormChange('category', e.target.value)} className={input}>
                      <option value="">Select Category</option><option>General</option><option>OBC</option><option>SC</option><option>ST</option>
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                    <div><span className="font-medium">Name:</span> {formFields.firstName} {formFields.lastName}</div>
                    <div><span className="font-medium">DOB:</span> {dob || 'Not set'}</div>
                    <div><span className="font-medium">Age:</span> {age || 'Not calculated'}</div>
                    <div><span className="font-medium">Gender:</span> {formFields.gender || 'Not set'}</div>
                    <div><span className="font-medium">Father:</span> {formFields.fatherName || 'Not set'}</div>
                    <div><span className="font-medium">Mother:</span> {formFields.motherName || 'Not set'}</div>
                    <div><span className="font-medium">Category:</span> {formFields.category || 'Not set'}</div>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-blue-600 flex items-center">
                    <MapPin className="mr-2" size={20} />
                    Address Information
                  </h2>
                  <button
                    onClick={() => editStates.address ? saveSection('address') : toggleEditState('address')}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    disabled={isSaving}
                  >
                    {editStates.address ? (
                      <>
                        {isSaving ? <Loader className="mr-1 animate-spin" size={14} /> : <Save className="mr-1" size={14} />}
                        {isSaving ? 'Saving...' : 'Save'}
                      </>
                    ) : (
                      <>
                        <Edit3 className="mr-1" size={14} />
                        Edit
                      </>
                    )}
                  </button>
                </div>

                {editStates.address ? (
                  <>
                    <textarea placeholder="Permanent Address" value={formFields.permanentAddress} onChange={(e) => handleFormChange('permanentAddress', e.target.value)} className={`${input} mb-4`} rows="3"></textarea>
                    <div className="mb-4 flex items-center">
                      <input type="checkbox" checked={sameAddress} onChange={() => setSameAddress(!sameAddress)} className="mr-2" />
                      <span className="text-gray-700">Same as Permanent Address</span>
                    </div>
                    {!sameAddress && (<textarea placeholder="Temporary Address" value={formFields.temporaryAddress} onChange={(e) => handleFormChange('temporaryAddress', e.target.value)} className={input} rows="3"></textarea>)}
                  </>
                ) : (
                  <div className="space-y-3 text-gray-600">
                    <div><span className="font-medium">Permanent:</span> {formFields.permanentAddress || 'Not set'}</div>
                    {!sameAddress && <div><span className="font-medium">Temporary:</span> {formFields.temporaryAddress || 'Not set'}</div>}
                  </div>
                )}
              </div>

              {/* Professional Details */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-blue-600 flex items-center">
                    <Briefcase className="mr-2" size={20} />
                    Professional Details
                  </h2>
                  <button
                    onClick={() => editStates.professional ? saveSection('professional') : toggleEditState('professional')}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    disabled={isSaving}
                  >
                    {editStates.professional ? (
                      <>
                        {isSaving ? <Loader className="mr-1 animate-spin" size={14} /> : <Save className="mr-1" size={14} />}
                        {isSaving ? 'Saving...' : 'Save'}
                      </>
                    ) : (
                      <>
                        <Edit3 className="mr-1" size={14} />
                        Edit
                      </>
                    )}
                  </button>
                </div>

                {editStates.professional ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Designation" value={formFields.designation} onChange={(e) => handleFormChange('designation', e.target.value)} className={input} />
                    <input type="text" placeholder="Department" value={formFields.department} onChange={(e) => handleFormChange('department', e.target.value)} className={input} />
                    <input type="number" placeholder="Base Salary" value={formFields.salary} onChange={(e) => handleFormChange('salary', e.target.value)} className={input} />
                    <input type="date" placeholder="Joining Date" value={formFields.joiningDate} onChange={(e) => handleFormChange('joiningDate', e.target.value)} className={input} />
                    <input type="text" placeholder="Highest Qualification" value={formFields.qualification} onChange={(e) => handleFormChange('qualification', e.target.value)} className={input} />
                    <input type="text" placeholder="Total Experience (Years)" value={formFields.experience} onChange={(e) => handleFormChange('experience', e.target.value)} className={input} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                    <div><span className="font-medium">Designation:</span> {formFields.designation || 'Not set'}</div>
                    <div><span className="font-medium">Department:</span> {formFields.department || 'Not set'}</div>
                    <div><span className="font-medium">Base Salary:</span> {formFields.salary ? `₹${formFields.salary}` : 'Not set'}</div>
                    <div><span className="font-medium">Joining Date:</span> {formFields.joiningDate || 'Not set'}</div>
                    <div><span className="font-medium">Qualification:</span> {formFields.qualification || 'Not set'}</div>
                    <div><span className="font-medium">Experience:</span> {formFields.experience ? `${formFields.experience} years` : 'Not set'}</div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-blue-600 flex items-center">
                    <Phone className="mr-2" size={20} />
                    Contact Information
                  </h2>
                  <button
                    onClick={() => editStates.contact ? saveSection('contact') : toggleEditState('contact')}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    disabled={isSaving}
                  >
                    {editStates.contact ? (
                      <>
                        {isSaving ? <Loader className="mr-1 animate-spin" size={14} /> : <Save className="mr-1" size={14} />}
                        {isSaving ? 'Saving...' : 'Save'}
                      </>
                    ) : (
                      <>
                        <Edit3 className="mr-1" size={14} />
                        Edit
                      </>
                    )}
                  </button>
                </div>

                {editStates.contact ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Phone Number" value={formFields.phone} onChange={(e) => handleFormChange('phone', e.target.value)} className={input} />
                    <input type="email" placeholder="Email" value={formFields.email} onChange={(e) => handleFormChange('email', e.target.value)} className={input} />
                    <input type="text" placeholder="Emergency Contact" value={formFields.emergencyContact} onChange={(e) => handleFormChange('emergencyContact', e.target.value)} className={input} />
                  </div>
                ) : (
                  <div className="space-y-2 text-gray-600">
                    <div><span className="font-medium">Phone:</span> {formFields.phone || 'Not set'}</div>
                    <div><span className="font-medium">Email:</span> {formFields.email || 'Not set'}</div>
                    <div><span className="font-medium">Emergency:</span> {formFields.emergencyContact || 'Not set'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}