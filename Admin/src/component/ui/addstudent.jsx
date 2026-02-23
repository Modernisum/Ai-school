// StudentFormPage.jsx - FIXED VERSION with Complete Document Upload Functionality
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Pencil, Upload, X, Plus, Trash2, Loader, CheckCircle, AlertTriangle, 
  Save, CloudUpload, FileText, Edit3, User, MapPin, GraduationCap, 
  Phone, BookOpen, FolderOpen, Eye, Check, Settings, ArrowLeft
} from "lucide-react";

// --- API Configuration ---

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const MAX_RETRIES = 3;

// --- Document Schemas ---
const MANUAL_SCHEMAS = {
  aadhaar: ["name", "dob", "gender", "fatherName", "adharNumber", "residenceAddress"],
  birthcertificate: [
    "name", "fatherName", "motherName", "gender", "dob", "address",
    "applicationNumber", "certificateNumber", "updateDate", "issueAgency",
  ],
  transfercertificate: [
    "name", "fatherName", "motherName", "dob", "issueSchoolName", "schoolAddress",
    "studentPerformance", "tcSerialNumber", "certificateNumber", "createdDate",
    "previousSinceYears", "tcClassName", "tcIssueDate", "tcReason",
    "className", "graduation", "stream",
  ],
  bankpassbook: ["name", "dob", "bankName", "ifscCode", "accountNumber", "branchName", "branchAddress", "openDate"],
  marksheet: [
    "name", "fatherName", "motherName", "schoolName", "className", "graduation",
    "stream", "section", "rollNumber", "serialNumber",
    "totalMaxMarksOrGrade", "totalObtainedMarksOrGrade", "percentageOrGrade",
    "resultStatus", "performance", "resultIssueDate", "resultSerialNumber",
    "resultIssueOrganization", "boardUniversity", "schoolAddress",
  ],
  domicilecertificate: ["applicantName", "husbandName", "motherName", "houseNumber", "mohalla", "village", "policeStation", "tehsil", "district", "applicationNumber", "certificateNumber", "dateOfIssue"],
  incomecertificate: ["applicantName", "fatherName", "motherName", "issueDate", "incomeAmount", "applicationNumber", "certificateNumber"],
  castecertificate: ["applicantName", "fatherName", "motherName", "casteCategory", "issueDate", "applicationNumber", "certificateNumber"],
};

const REVERSE_DOC_MAPPING = {
    "aadhaar": "Aadhar Card",
    "birthcertificate": "Birth Certificate",
    "transfercertificate": "Transfer Certificate",
    "bankpassbook": "Bank Pass Book",
    "marksheet": "Marksheets",
    "domicilecertificate": "Domicile Certificate",
    "castecertificate": "Caste Certificate",
    "incomecertificate": "Income Certificate",
    "photo": "Photo",
    "other": "Others",
};

// **AUTO School ID Management - No User Input Required**
const getSchoolIdFromStorage = () => {
  try {
    // Try multiple possible localStorage keys that your app might use
    const possibleKeys = [
      'schoolId',           // Primary key
      'school_id',          // Alternative
      'currentSchoolId',    // Alternative
      'selectedSchoolId',   // Alternative
      'userSchoolId',       // Alternative
      'SCHOOL_ID'           // Alternative
    ];
    
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
        console.log(`School ID found in localStorage key "${key}": ${value}`);
        return value.trim();
      }
    }
    
    // Also try to get from nested objects
    const userData = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.schoolId) return parsed.schoolId;
        if (parsed.school_id) return parsed.school_id;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    const schoolData = localStorage.getItem('schoolData');
    if (schoolData) {
      try {
        const parsed = JSON.parse(schoolData);
        if (parsed.schoolId) return parsed.schoolId;
        if (parsed.id) return parsed.id;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    console.warn('School ID not found in localStorage');
    return null;
  } catch (error) {
    console.error('Error reading School ID from localStorage:', error);
    return null;
  }
};

// Default fallback School ID if none found in localStorage
const DEFAULT_SCHOOL_ID = "342635";

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

const formatDocType = (friendlyName) => {
    const mapping = {
        "aadhar card": "aadhaar",
        "birth certificate": "birthcertificate",
        "transfer certificate": "transfercertificate",
        "bank pass book": "bankpassbook",
        "marksheet": "marksheet",
        "marksheets": "marksheet",
        "domicile certificate": "domicilecertificate",
        "caste certificate": "castecertificate",
        "income certificate": "incomecertificate",
        "photo": "photo",
        "others": "other"
    };
    const lowerCaseName = friendlyName.toLowerCase();
    return mapping[lowerCaseName] || lowerCaseName.replace(/\s/g, '');
};

const getIndexByFriendlyName = (friendlyName, documentsArray) => {
    return documentsArray.findIndex(doc => doc.type === friendlyName);
};

// Initial state for Marksheets
const initialMarksheet = {
    id: 1,
    className: "",
    maxTotal: "",
    percentage: "",
    resultStatus: "",
    subjects: [{ id: 101, name: "", obtained: "", max: "" }],
    boardUniversity: "",
    schoolName: "",
    rollNumber: "",
    totalObtainedMarks: "",
    totalMaxMarks: "",
    isExtracted: false,
};

// Initial state for all document slots
const initialDocuments = [
    { type: "Photo", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    {
        type: "Aadhar Card",
        status: 'idle',
        extracted: null,
        front: { url: null, status: 'idle' },
        back: { url: null, status: 'idle' },
    },
    { type: "Birth Certificate", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    { type: "Transfer Certificate", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    { type: "Domicile Certificate", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    { type: "Caste Certificate", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    { type: "Income Certificate", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    { type: "Bank Pass Book", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    { type: "Marksheets", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
    { type: "Others", file: null, preview: null, status: 'idle', url: null, documentType: null, extracted: null, inputRef: React.createRef() },
];

// --- AADHAAR DIALOG COMPONENT ---
const AadhaarUploadDialog = ({ aadharData, onClose, onUpload }) => {
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
};

export default function StudentFormPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode'); // 'add' or 'edit'
  const classFromUrl = queryParams.get('class');
  const studentIdFromUrl = queryParams.get('studentId');
  
  // --- Form State ---
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [sameAddress, setSameAddress] = useState(true);
  const [selectedClass, setSelectedClass] = useState(classFromUrl || "");
  const [loadStudentId, setLoadStudentId] = useState(studentIdFromUrl || "");
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
    previousSchool: "",
    board: "",
    passingYear: "",
    tcNumber: "",
    phone: "",
    email: "",
    emergencyContact: "",
  });

  // --- **AUTO SCHOOL ID STATE - No User Input** ---
  const [schoolId, setSchoolId] = useState("");
  const [schoolIdSource, setSchoolIdSource] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // --- API / BACKEND INTEGRATION STATE ---
  const [studentData, setStudentData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingExisting, setIsFetchingExisting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  const [showDialog, setShowDialog] = useState(!mode || !studentIdFromUrl); // Show dialog if no direct params
  const [isAadhaarDialogOpen, setIsAadhaarDialogOpen] = useState(false);

  // --- EDIT STATE FOR FORM SECTIONS ---
  const [editStates, setEditStates] = useState({
    basicDetails: mode === 'add',
    address: mode === 'add',
    academic: mode === 'add',
    contact: mode === 'add',
    marksheets: false,
    documents: {}
  });

  // --- MANUAL DOCUMENT STATE ---
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [manualDocumentData, setManualDocumentData] = useState({});
  const [documentExists, setDocumentExists] = useState(false);
  const [isDocumentDataLoading, setIsDocumentDataLoading] = useState(false);
  const [isDocumentDataSaving, setIsDocumentDataSaving] = useState(false);
  const [isDocumentDataDeleting, setIsDocumentDataDeleting] = useState(false);

  // --- Marksheet State ---
  const [marksheets, setMarksheets] = useState([{ ...initialMarksheet, id: 1 }]);
  const nextMarksheetId = useRef(2);
  const nextSubjectId = useRef(200);

  // **AUTO School ID Initialization - No User Dialog**
  useEffect(() => {
    // ✅ FIXED: Enhanced API configuration validation
    if (!API_BASE_URL) {
        setApiError("API_BASE_URL is not configured. Please check your environment variables (.env file).");
        return;
    }
    
    // ✅ Log the API base URL for debugging
    console.log(`🌐 API Base URL: ${API_BASE_URL}`);
    
    const initializeSchoolId = () => {
      console.log('🔍 Searching for School ID in localStorage...');
      
      // Get School ID from localStorage automatically
      const foundSchoolId = getSchoolIdFromStorage();
      
      if (foundSchoolId) {
        setSchoolId(foundSchoolId);
        setSchoolIdSource('localStorage');
        console.log(`✅ School ID found: ${foundSchoolId}`);
        setApiSuccess(`School ID loaded: ${foundSchoolId}`);
      } else {
        // Use default fallback if not found
        setSchoolId(DEFAULT_SCHOOL_ID);
        setSchoolIdSource('default_fallback');
        console.log(`⚠️ School ID not found in localStorage, using default: ${DEFAULT_SCHOOL_ID}`);
        setApiSuccess(`Using default School ID: ${DEFAULT_SCHOOL_ID}`);
      }
      
      setMarksheets(prev => [{...prev[0], className: selectedClass || prev[0].className}, ...prev.slice(1)]);
      setIsInitialized(true);
    };

    initializeSchoolId();
  }, [selectedClass]);

  // **Handle URL params after School ID is initialized**
  useEffect(() => {
    if (!isInitialized || !schoolId) return;

    console.log(`🚀 Handling URL params with School ID: ${schoolId}`);
    
    // **Handle URL params for direct student editing**
    if (mode === 'edit' && studentIdFromUrl) {
      setLoadStudentId(studentIdFromUrl);
      setShowDialog(false);
      console.log(`📖 Loading existing student: ${studentIdFromUrl}`);
      // Fetch student data immediately
      setTimeout(() => {
        fetchStudentData(studentIdFromUrl);
      }, 100);
    } else if (mode === 'add' && classFromUrl) {
      setSelectedClass(classFromUrl);
      setShowDialog(false);
      console.log(`➕ Creating new student for class: ${classFromUrl}`);
      // Create student immediately
      setTimeout(() => {
        createInitialStudent(classFromUrl);
      }, 100);
    }
  }, [isInitialized, schoolId, mode, classFromUrl, studentIdFromUrl]);

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
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiSuccess(`${section} saved successfully!`);
      setEditStates(prev => ({ ...prev, [section]: false }));
    } catch (error) {
      setApiError(`Failed to save ${section}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FIXED: Enhanced Central API Helper with detailed logging
  const callApiWithBackoff = async (apiUrl, options) => {
      let lastError = null;
      
      // ✅ Add detailed logging for debugging
      console.log(`🔗 API Call: ${options.method || 'GET'} ${apiUrl}`);
      
      for (let i = 0; i < MAX_RETRIES; i++) {
          try {
              if (i > 0) {
                  const delay = Math.pow(2, i) * 1000;
                  console.log(`⏳ Retry ${i} after ${delay}ms delay...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
              }

              const response = await fetch(apiUrl, options);
              
              // ✅ Enhanced error logging
              console.log(`📡 Response: ${response.status} ${response.statusText}`);

              let result;
              try {
                  result = await response.json();
              } catch (e) {
                  const text = await response.text();
                  console.error(`❌ JSON Parse Error: ${e.message}`);
                  console.error(`📄 Raw Response: ${text.substring(0, 200)}...`);
                  
                  if (!response.ok) {
                      throw new Error(`HTTP Error ${response.status}: Failed to parse response. Server returned HTML instead of JSON. Check if the API endpoint exists.`);
                  }
                  return { success: true, message: "Operation completed, but response was empty or non-JSON." };
              }

              if (response.ok) {
                  console.log(`✅ Success: ${result.message || 'Operation completed'}`);
                  return result;
              } else {
                  const errorMessage = result.message || result.error || `HTTP Error ${response.status}`;
                  throw new Error(errorMessage);
              }
          } catch (error) {
              lastError = error;
              console.error(`❌ Attempt ${i + 1} failed: ${error.message}`);
              
              if (i === MAX_RETRIES - 1) {
                   throw new Error(`${lastError.message}`);
              }
          }
      }
  };

  // Populate marksheet from extracted data
  const populateMarksheetFromExtractedData = (extracted) => {
      if (!extracted || extracted.documentType !== 'marksheet') return;

      const subjects = (extracted.subjects || []).map(sub => ({
          id: nextSubjectId.current++,
          name: sub.subject || "",
          obtained: sub.obtainedMarksOrGrade || "",
          max: sub.maxMarksOrGrade || "",
      }));

      const newMarksheet = {
          id: nextMarksheetId.current++,
          className: extracted.className || "",
          maxTotal: extracted.totalMaxMarksOrGrade || "",
          percentage: extracted.percentageOrGrade || "",
          resultStatus: extracted.resultStatus || "",
          subjects: subjects.length > 0 ? subjects : [{ id: nextSubjectId.current++, name: "", obtained: "", max: "" }],
          boardUniversity: extracted.boardUniversity || "",
          schoolName: extracted.schoolName || "",
          rollNumber: extracted.rollNumber || "",
          totalObtainedMarks: extracted.totalObtainedMarksOrGrade || "",
          totalMaxMarks: extracted.totalMaxMarksOrGrade || "",
          isExtracted: true,
      };

      setFormFields(prev => ({
          ...prev,
          previousSchool: prev.previousSchool || extracted.schoolName || "",
          board: prev.board || extracted.boardUniversity || "",
          fatherName: prev.fatherName || extracted.fatherName || "",
          motherName: prev.motherName || extracted.motherName || "",
      }));

      setMarksheets(prev => {
          const alreadyExists = prev.some(ms =>
              ms.isExtracted &&
              ms.rollNumber === newMarksheet.rollNumber &&
              ms.className === newMarksheet.className &&
              ms.schoolName === newMarksheet.schoolName &&
              ms.totalObtainedMarks === newMarksheet.totalObtainedMarks
          );

          if (alreadyExists) {
              return prev;
          }

          const isInitialEmpty = prev.length === 1 && prev[0].id === 1 && !prev[0].totalMaxMarks && !prev[0].schoolName;

          if (isInitialEmpty) {
              return [{ ...newMarksheet, id: 1, className: prev[0].className || newMarksheet.className }];
          } else {
              return [newMarksheet, ...prev];
          }
      });
  };

  // ✅ FIXED: Updated uploadAadhaarSide function with consistent API endpoint
  const uploadAadhaarSide = async (file, side) => {
    if (!schoolId || !studentData?.studentId) {
        setApiError("Cannot upload document: Missing School ID or Student ID.");
        return;
    }

    const docType = "aadhaar";
    const aadhaarIndex = documents.findIndex(doc => doc.type === "Aadhar Card");
    if (aadhaarIndex === -1) return;

    // ✅ FIXED: Use the same consistent API endpoint
    const apiUrl = `${API_BASE_URL}/documentUpload/${schoolId}/student/${studentData.studentId}`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", docType);
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

        if (result.success) {
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

  // ✅ FIXED: Upload document file with consistent API endpoint
  const uploadDocumentFile = async (index, file) => {
    if (!schoolId || !studentData?.studentId) {
        setApiError("Cannot upload document: Missing School ID or Student ID.");
        setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, status: 'error' } : doc));
        return;
    }

    const docTypeFriendly = documents[index].type;
    const docType = formatDocType(docTypeFriendly);
    const isMarksheet = docType === 'marksheet';

    // ✅ FIXED: Use the correct API endpoint for non-Aadhaar documents (same as Aadhaar)
    const apiUrl = `${API_BASE_URL}/documentUpload/${schoolId}/student/${studentData.studentId}`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", docType);
    if(isMarksheet) formData.append("indexNumber", "1");

    console.log(`🔗 Document Upload: ${apiUrl} (${docTypeFriendly} -> ${docType})`);

    setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, status: 'uploading' } : doc));

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            if (i > 0) { 
                const delay = Math.pow(2, i) * 1000;
                console.log(`⏳ Document Upload Retry ${i} after ${delay}ms delay...`);
                await new Promise(resolve => setTimeout(resolve, delay)); 
            }

            const response = await fetch(apiUrl, { method: 'POST', body: formData, });
            console.log(`📡 Document Response: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Document Upload Failed: ${errorText.substring(0, 100)}`);
                throw new Error(`HTTP Error ${response.status}: ${errorText.substring(0, 100)}...`);
            }

            const result = await response.json();

            if (result.success) {
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

                if (result.extractedData && result.documentType === 'marksheet') {
                    populateMarksheetFromExtractedData(result.extractedData);
                }
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
      if (!studentData) {
          setApiError("Please start a new admission or load an existing student before uploading documents.");
          return;
      }

      if (doc.type === "Aadhar Card") {
          setIsAadhaarDialogOpen(true);
      } else if (doc.inputRef?.current) {
          doc.inputRef.current.click();
      }
  };

  // Fetch all documents data
  const fetchAllDocumentsData = async (studentIdValue) => {
    if (!schoolId || !studentIdValue) return;

    const apiUrl = `${API_BASE_URL}/documentbox/${schoolId}/students/${studentIdValue}/documents`;
    console.log(`🔗 Fetching Documents: ${apiUrl}`);
    setApiError(null);

    try {
        const result = await callApiWithBackoff(apiUrl, { method: 'GET' });

        if (result.status === "success" && result.documents) {
            const fetchedDocuments = result.documents;
            setDocuments(prevDocs => {
                let newDocs = [...prevDocs];
                let marksheetFound = false;

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
                            if (docTypeKey === 'marksheet' && docData) {
                                marksheetFound = docData;
                            }
                        }
                    }
                });

                if (marksheetFound) {
                    populateMarksheetFromExtractedData(marksheetFound);
                }
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

  // Student API Handlers
  const createInitialStudent = async (className) => {
    if (!schoolId) { 
      setApiError("School ID not available. Please refresh the page."); 
      return; 
    }
    
    setIsLoading(true); setApiError(null);
    const apiUrl = `${API_BASE_URL}/students/${schoolId}/students`;
    const requestBody = { className: className };
    
    try {
        console.log(`📝 Creating student with class: ${className}, School ID: ${schoolId}`);
        const result = await callApiWithBackoff(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), });
        
        if (result.success && result.data) {
            setStudentData(result.data);
            setMarksheets(prev => prev.map((ms, index) => index === 0 ? { ...ms, className: result.data.className } : ms));
            setShowDialog(false);
            setApiSuccess(`New student ID ${result.data.studentId} assigned. Please fill out the form and Save.`);
        } else {
            throw new Error(result.message || 'Unknown application error occurred during POST operation.');
        }
    } catch (error) { 
      console.error('Error creating student:', error);
      setApiError(`Failed to create student: ${error.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const fetchStudentData = async (studentIdValue) => {
    if (!schoolId) { 
      setApiError("School ID not available. Please refresh the page."); 
      return; 
    }
    
    setIsFetchingExisting(true); setApiError(null);
    const apiUrl = `${API_BASE_URL}/students/${schoolId}/students/${studentIdValue}`;
    
    try {
        console.log(`📖 Fetching student data from: ${apiUrl}`);
        const result = await callApiWithBackoff(apiUrl, { method: 'GET' });
        console.log('Student data response:', result);
        
        if (result.success && result.data) {
            const data = result.data;
            setStudentData(data);
            
            // **COMPLETE Field Population - Handle ALL possible field names from database**
            console.log('Populating form fields from student data:', data);
            
            setFormFields(prev => ({
                ...prev, 
                firstName: data.firstName || (data.name ? data.name.split(' ')[0] : "") || "", 
                lastName: data.lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : "") || "", 
                fatherName: data.fatherName || data.father_name || "", 
                motherName: data.motherName || data.mother_name || "", 
                gender: data.gender || "", 
                category: data.category || data.caste_category || "", 
                permanentAddress: data.permanentAddress || data.permanent_address || data.address || "", 
                temporaryAddress: data.temporaryAddress || data.temporary_address || data.currentAddress || "", 
                previousSchool: data.previousSchool || data.previous_school || data.lastSchool || "", 
                board: data.board || data.previous_board || data.boardUniversity || "", 
                passingYear: data.passingYear || data.passing_year || data.previousYear || "", 
                tcNumber: data.tcNumber || data.tc_number || data.transferCertificateNumber || "", 
                phone: data.phone || data.phoneNumber || data.phone_number || data.contactNumber || "", 
                email: data.email || data.emailAddress || data.email_address || "", 
                emergencyContact: data.emergencyContact || data.emergency_contact || data.emergencyNumber || "",
            }));
            
            // Set DOB and calculate age
            if (data.dateOfBirth || data.dob || data.date_of_birth) { 
              const dobValue = data.dateOfBirth || data.dob || data.date_of_birth;
              setDob(dobValue);
              handleDobChange({ target: { value: dobValue } }); 
            }

            // Set address checkbox state
            if (data.temporaryAddress && data.permanentAddress) {
              setSameAddress(data.temporaryAddress === data.permanentAddress);
            }

            await fetchAllDocumentsData(studentIdValue);

            setShowDialog(false);
            setApiSuccess(`Student ${studentIdValue} data loaded successfully with ALL fields populated.`);
        } else {
            throw new Error(result.message || 'Student not found in database.');
        }
    } catch (error) { 
        console.error('Error fetching student data:', error);
        setApiError(`Failed to load student data: ${error.message}`); 
    } finally { 
        setIsFetchingExisting(false); 
    }
  };

  // Manual Document API handlers
  const getDocumentApiUrl = useCallback((docType) => {
    if (!schoolId || !studentData?.studentId || !docType) return null;
    return `${API_BASE_URL}/documentbox/${schoolId}/students/${studentData.studentId}/documents/${docType}`;
  }, [schoolId, studentData?.studentId]);

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
          await fetchAllDocumentsData(studentData.studentId);

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
          await fetchAllDocumentsData(studentData.studentId);

      } catch (error) {
          setApiError(`Failed to delete ${docType} data: ${error.message}`);
      } finally {
          setIsDocumentDataDeleting(false);
      }
  };

  useEffect(() => {
      if (studentData?.studentId && selectedDocumentType) {
          fetchDocumentData(selectedDocumentType);
      } else {
          setManualDocumentData({});
          setDocumentExists(false);
      }
  }, [selectedDocumentType, studentData?.studentId, fetchDocumentData]);

  // Event handlers
  const handleBack = () => {
    navigate('/dashboard/student');
  };
  
  const handleContinueNew = () => { 
    if (selectedClass) { 
      createInitialStudent(selectedClass); 
    } else { 
      setApiError("Please select a class for new admission."); 
    } 
  };
  
  const handleContinueExisting = () => { 
    if (loadStudentId) { 
      fetchStudentData(loadStudentId); 
    } else { 
      setApiError("Please enter a Student ID to load existing data."); 
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

  // Marksheet Handlers
  const handleAddMarksheet = () => {
    setMarksheets(prev => [
        ...prev,
        {
            ...initialMarksheet,
            id: nextMarksheetId.current++,
            subjects: [{ id: nextSubjectId.current++, name: "", obtained: "", max: "" }],
        },
    ]);
  };
  const handleRemoveMarksheet = (marksheetId) => { setMarksheets(prev => prev.filter(ms => ms.id !== marksheetId)); };
  const handleMarksheetChange = (marksheetId, field, value) => { setMarksheets(prev => prev.map(ms => ms.id === marksheetId ? { ...ms, [field]: value } : ms)); };
  const handleAddSubject = (marksheetId) => {
    setMarksheets(prev =>
        prev.map(ms =>
            ms.id === marksheetId
                ? { ...ms, subjects: [...ms.subjects, { id: nextSubjectId.current++, name: "", obtained: "", max: "" }] }
                : ms
        )
    );
  };
  const handleSubjectChange = (marksheetId, subjectId, field, value) => { setMarksheets(prev => prev.map(ms => ms.id === marksheetId ? { ...ms, subjects: ms.subjects.map(sub => sub.id === subjectId ? { ...sub, [field]: value } : sub) } : ms)); };
  const handleRemoveSubject = (marksheetId, subjectId) => { setMarksheets(prev => prev.map(ms => ms.id === marksheetId ? { ...ms, subjects: ms.subjects.filter(sub => sub.id !== subjectId) } : ms)); };

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
              {doc.extracted.applicantName && <p><span className="font-medium">Applicant:</span> {doc.extracted.applicantName}</p>}
              {doc.extracted.dob && <p><span className="font-medium">DOB:</span> {doc.extracted.dob}</p>}
              {doc.extracted.certificateNumber && <p><span className="font-medium">Certificate #:</span> {doc.extracted.certificateNumber}</p>}
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

  // Marksheet container component
  const MarksheetContainer = ({ marksheet, index }) => {
    const isEditing = editStates.marksheets;
    return (
      <div className={`p-4 border rounded-lg mb-4 bg-white shadow-inner ${index === 0 && marksheet.isExtracted ? 'border-green-500 bg-green-50' : (index > 0 ? 'mt-4 border-gray-300' : 'border-blue-400')}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
              <BookOpen className="mr-2" size={20} />
              Marksheet {index + 1} ({marksheet.className || 'N/A'})
              {marksheet.isExtracted && <span className="ml-3 text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">DATA EXTRACTED</span>}
          </h3>
          <div className="flex items-center gap-2">
            {marksheets.length > 1 && (
                <button
                    onClick={() => handleRemoveMarksheet(marksheet.id)}
                    className="text-red-500 hover:text-red-700 transition p-1 rounded-full hover:bg-red-100"
                >
                    <Trash2 size={18} />
                </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm">
              <input type="text" placeholder="Class Name" value={marksheet.className} onChange={(e) => handleMarksheetChange(marksheet.id, 'className', e.target.value)} className={input} />
              <input type="text" placeholder="Board/University" value={marksheet.boardUniversity} onChange={(e) => handleMarksheetChange(marksheet.id, 'boardUniversity', e.target.value)} className={input} />
              <input type="text" placeholder="School Name" value={marksheet.schoolName} onChange={(e) => handleMarksheetChange(marksheet.id, 'schoolName', e.target.value)} className={input} />
              <input type="text" placeholder="Roll Number" value={marksheet.rollNumber} onChange={(e) => handleMarksheetChange(marksheet.id, 'rollNumber', e.target.value)} className={input} />

              <input type="number" placeholder="Total Max Marks" value={marksheet.totalMaxMarks} onChange={(e) => handleMarksheetChange(marksheet.id, 'totalMaxMarks', e.target.value)} className={input} />
              <input type="number" placeholder="Total Obtained Marks" value={marksheet.totalObtainedMarks} onChange={(e) => handleMarksheetChange(marksheet.id, 'totalObtainedMarks', e.target.value)} className={input} />
              <select value={marksheet.resultStatus} onChange={(e) => handleMarksheetChange(marksheet.id, 'resultStatus', e.target.value)} className={input}>
                <option value="">Result Status</option><option>Passed</option><option>Failed</option><option>Awaited</option>
              </select>
              <input type="text" placeholder="Percentage / Grade" value={marksheet.percentage} onChange={(e) => handleMarksheetChange(marksheet.id, 'percentage', e.target.value)} className={input} />
            </div>
            <h4 className="text-md font-medium text-blue-600 mb-3 border-t pt-3">Subject Details:</h4>
            {marksheet.subjects.map((subject, subIndex) => (
              <div key={subject.id} className="grid grid-cols-8 gap-2 mb-2 items-center">
                <div className="col-span-3">
                   <input type="text" placeholder={`Subject ${subIndex + 1} Name`} value={subject.name} onChange={(e) => handleSubjectChange(marksheet.id, subject.id, 'name', e.target.value)} className={input} />
                </div>
                <div className="col-span-2">
                  <input type="text" placeholder="Max Marks" value={subject.max} onChange={(e) => handleSubjectChange(marksheet.id, subject.id, 'max', e.target.value)} className={input} />
                </div>
                <div className="col-span-2">
                  <input type="text" placeholder="Obtained Marks" value={subject.obtained} onChange={(e) => handleSubjectChange(marksheet.id, subject.id, 'obtained', e.target.value)} className={input} />
                </div>
                <button onClick={() => handleRemoveSubject(marksheet.id, subject.id)} className="col-span-1 flex justify-center text-red-500 hover:text-white p-2 rounded-full hover:bg-red-500 transition">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button onClick={() => handleAddSubject(marksheet.id)} className="mt-2 flex items-center text-blue-600 font-medium hover:text-blue-800 transition">
              <Plus size={16} className="mr-1" /> Add Subject
            </button>
          </>
        ) : (
          <div className="text-gray-600">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="font-medium">Class:</span> {marksheet.className || 'N/A'}</div>
              <div><span className="font-medium">Board:</span> {marksheet.boardUniversity || 'N/A'}</div>
              <div><span className="font-medium">School:</span> {marksheet.schoolName || 'N/A'}</div>
              <div><span className="font-medium">Roll:</span> {marksheet.rollNumber || 'N/A'}</div>
              <div><span className="font-medium">Total:</span> {marksheet.totalObtainedMarks}/{marksheet.totalMaxMarks}</div>
              <div><span className="font-medium">Percentage:</span> {marksheet.percentage || 'N/A'}</div>
              <div><span className="font-medium">Status:</span> {marksheet.resultStatus || 'N/A'}</div>
            </div>
            {marksheet.subjects.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <div className="text-sm font-medium text-blue-600 mb-2">Subjects:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {marksheet.subjects.map(subject => (
                    <div key={subject.id} className="bg-gray-50 p-2 rounded">
                      <span className="font-medium">{subject.name || `Subject ${subject.id}`}:</span> {subject.obtained}/{subject.max}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Error and Success components
  const ErrorDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100] p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-[90%] max-w-md border-4 border-red-500">
        <div className="flex items-center mb-4">
          <AlertTriangle size={30} className="text-red-600 mr-3"/>
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
             isLoading ? 'Creating student record...' : 
             'Loading complete student data...'}
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
              aadharData={documents.find(doc => doc.type === 'Aadhar Card')}
              onClose={() => setIsAadhaarDialogOpen(false)}
              onUpload={uploadAadhaarSide}
          />
      )}

      {/* Header with automatic School ID display */}
      <div className="w-full max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft className="mr-2" size={20} />
            Back to Student Page
          </button>
          
          <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <span>School ID: <span className="font-bold text-blue-600">{schoolId}</span></span>
              <span className="mx-2">|</span>
              <span className="text-green-600">
                {schoolIdSource === 'localStorage' ? '✅ From Storage' : '⚠️ Default'}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Complete Student Management System - FIXED VERSION
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
              Admission Workflow
            </h2>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">
              School ID: <span className="font-semibold text-blue-600">{schoolId}</span>
              {schoolIdSource === 'default_fallback' && <span className="text-orange-600 ml-2">(Default)</span>}
            </p>

            <div className="mb-8 p-4 border-2 border-dashed border-blue-400 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-600 mb-3 flex items-center justify-center">
                  <User className="mr-2" size={20} />
                  New Student Enrollment
                </h3>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full rounded-lg border-2 border-blue-500 px-3 py-2 shadow-sm mb-4 focus:border-blue-600 focus:ring focus:ring-blue-300">
                  <option value="">-- Select Class --</option>
                  <option value="class-1">Class 1</option><option value="class-2">Class 2</option><option value="class-5">Class 5</option><option value="class-9">Class 9</option><option value="class-11">Class 11</option>
                </select>
                <button disabled={!selectedClass || isLoading || !schoolId || isFetchingExisting || isSaving} onClick={handleContinueNew} className="w-full px-6 py-2 bg-gradient-to-r from-blue-500 to-red-500 text-white font-semibold rounded-lg shadow hover:scale-105 transition disabled:opacity-50 flex items-center justify-center">
                  {isLoading ? (<><Loader size={20} className="mr-2 animate-spin" /> Creating...</>) : (<><Plus className="mr-2" size={20} />Start New Admission</>)}
                </button>
            </div>

            <div className="p-4 border-2 border-dashed border-red-400 rounded-lg">
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center justify-center">
                  <FolderOpen className="mr-2" size={20} />
                  Load Existing Student
                </h3>
                <input type="text" placeholder="Enter Student ID (e.g., S000005)" value={loadStudentId} onChange={(e) => setLoadStudentId(e.target.value)} className="w-full rounded-lg border-2 border-red-500 px-3 py-2 shadow-sm mb-4 focus:border-red-600 focus:ring focus:ring-red-300"/>
                <button disabled={!loadStudentId || isFetchingExisting || isLoading || !schoolId || isSaving} onClick={handleContinueExisting} className="w-full px-6 py-2 bg-gradient-to-r from-red-500 to-yellow-500 text-white font-semibold rounded-lg shadow hover:scale-105 transition disabled:opacity-50 flex items-center justify-center">
                   {isFetchingExisting ? (<><Loader size={20} className="mr-2 animate-spin" /> Loading...</>) : (<><Upload className="mr-2" size={20} />Load Student Data</>)}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      {studentData && (
        <div className="w-full max-w-7xl">
          <h1 className="text-3xl font-bold mb-6 text-blue-700 text-center flex items-center justify-center">
            <User className="mr-3" size={32} />
            Student Management: {studentData.studentId}
          </h1>

          {/* Student Core Data Display */}
          <div className="w-full p-4 mb-6 rounded-xl border-4 border-dashed border-green-500 bg-green-50 shadow-inner">
            <h2 className="text-xl font-bold text-green-700 mb-2 flex items-center">
                <CheckCircle size={24} className="mr-2"/> Core Student Data
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm font-medium text-gray-700">
                <p>ID: <span className="font-bold text-blue-600">{studentData.studentId}</span></p>
                <p>Class: <span className="font-bold text-blue-600">{studentData.className}</span></p>
                <p>Roll No: <span className="font-bold text-blue-600">{studentData.rollNumber}</span></p>
                <p>Section: <span className="font-bold text-blue-600">{studentData.section}</span></p>
                <p>School: <span className="font-bold text-green-600">{schoolId}</span></p>
                <p>Created: <span className="font-bold text-blue-600">{formatTimestamp(studentData.createdAt)}</span></p>
            </div>
          </div>

          {/* Layout: 2 columns for better space utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Column */}
            <div className="space-y-6">

              {/* Document Upload Section */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
                  <CloudUpload className="mr-2" size={20} />
                  Document Upload - FIXED
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {documents.map((doc, idx) => {
                    if (doc.type === "Aadhar Card") {
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <select className={input}><option>Select Country</option><option>India</option></select>
                      <select className={input}><option>Select State</option><option>Uttar Pradesh</option></select>
                      <select className={input}><option>Select District</option><option>Meerut</option></select>
                    </div>
                    <textarea placeholder="Permanent Address" value={formFields.permanentAddress} onChange={(e) => handleFormChange('permanentAddress', e.target.value)} className={`${input} mb-4`} rows="3"></textarea>
                    <div className="mb-4 flex items-center">
                      <input type="checkbox" checked={sameAddress} onChange={() => setSameAddress(!sameAddress)} className="mr-2" />
                      <span className="text-gray-700">Same as Permanent Address</span>
                    </div>
                    {!sameAddress && ( <textarea placeholder="Temporary Address" value={formFields.temporaryAddress} onChange={(e) => handleFormChange('temporaryAddress', e.target.value)} className={input} rows="3"></textarea> )}
                  </>
                ) : (
                  <div className="space-y-3 text-gray-600">
                    <div><span className="font-medium">Permanent:</span> {formFields.permanentAddress || 'Not set'}</div>
                    {!sameAddress && <div><span className="font-medium">Temporary:</span> {formFields.temporaryAddress || 'Not set'}</div>}
                  </div>
                )}
              </div>

              {/* Academic History */}
              <div className="bg-white border rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-blue-600 flex items-center">
                    <GraduationCap className="mr-2" size={20} />
                    Academic History
                  </h2>
                  <button 
                    onClick={() => editStates.academic ? saveSection('academic') : toggleEditState('academic')}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    disabled={isSaving}
                  >
                    {editStates.academic ? (
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

                {editStates.academic ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Previous School" value={formFields.previousSchool} onChange={(e) => handleFormChange('previousSchool', e.target.value)} className={input} />
                    <select value={formFields.board} onChange={(e) => handleFormChange('board', e.target.value)} className={input}>
                      <option value="">Select Board</option>
                      <option>CBSE</option><option>ICSE</option><option>State Board</option>
                      {formFields.board && !['CBSE', 'ICSE', 'State Board'].includes(formFields.board) && <option value={formFields.board}>{formFields.board}</option>}
                    </select>
                    <input type="text" placeholder="Passing Year" value={formFields.passingYear} onChange={(e) => handleFormChange('passingYear', e.target.value)} className={input} />
                    <input type="text" placeholder="TC Number" value={formFields.tcNumber} onChange={(e) => handleFormChange('tcNumber', e.target.value)} className={input} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                    <div><span className="font-medium">Previous School:</span> {formFields.previousSchool || 'Not set'}</div>
                    <div><span className="font-medium">Board:</span> {formFields.board || 'Not set'}</div>
                    <div><span className="font-medium">Passing Year:</span> {formFields.passingYear || 'Not set'}</div>
                    <div><span className="font-medium">TC Number:</span> {formFields.tcNumber || 'Not set'}</div>
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

          {/* Full-width sections */}

          {/* Marksheet Section */}
          <div className="w-full mt-6 bg-white border rounded-xl shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-600 flex items-center">
                <BookOpen className="mr-2" size={20} />
                Marksheet History for {studentData.className}
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => editStates.marksheets ? saveSection('marksheets') : toggleEditState('marksheets')}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  disabled={isSaving}
                >
                  {editStates.marksheets ? (
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
                {editStates.marksheets && (
                  <button onClick={handleAddMarksheet} className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                    <Plus size={14} className="mr-1" /> Add Marksheet
                  </button>
                )}
              </div>
            </div>

            {marksheets.map((ms, index) => (<MarksheetContainer key={ms.id} marksheet={ms} index={index} />))}
          </div>
        </div>
      )}
    </div>
  );
}