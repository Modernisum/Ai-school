/**
 * Field Mapping Dictionary
 * Maps person data fields to common form field names, IDs, placeholders, and labels
 * Used by the injected script for smart form field detection
 */

const FIELD_MAP = {
  // Student/Employee name fields
  name: {
    dataKey: 'name',
    matches: [
      'name', 'Name', 'fullName', 'full_name', 'FullName',
      'studentName', 'student_name', 'StudentName',
      'candidateName', 'candidate_name', 'CandidateName',
      'firstName', 'first_name', 'FirstName',
      'applicantName', 'applicant_name',
      'empName', 'employeeName', 'employee_name',
    ],
    labels: ['name', 'full name', 'student name', 'candidate name', 'applicant name', 'first name', 'employee name'],
  },

  fatherName: {
    dataKey: 'fatherName',
    matches: [
      'fatherName', 'father_name', 'FatherName', 'FathersName',
      'fathersName', 'fathers_name', 'FatherName',
      'parentName', 'parent_name', 'ParentName',
      'guardianName', 'guardian_name', 'GuardianName',
    ],
    labels: ['father name', "father's name", 'parent name', 'guardian name'],
  },

  motherName: {
    dataKey: 'motherName',
    matches: [
      'motherName', 'mother_name', 'MotherName', 'MothersName',
      'mothersName', 'mothers_name',
    ],
    labels: ['mother name', "mother's name"],
  },

  dob: {
    dataKey: 'dob',
    type: 'date',
    matches: [
      'dob', 'DOB', 'dateOfBirth', 'date_of_birth', 'DateOfBirth',
      'birthDate', 'birth_date', 'BirthDate',
      'birthday', 'Birthday',
    ],
    labels: ['date of birth', 'dob', 'birth date', 'birthday', 'date na janm'],
  },

  gender: {
    dataKey: 'gender',
    type: 'select',
    matches: [
      'gender', 'Gender', 'sex', 'Sex',
    ],
    labels: ['gender', 'sex'],
    valueMap: {
      'male': ['male', 'm', 'M', 'Male', '1'],
      'female': ['female', 'f', 'F', 'Female', '2'],
      'other': ['other', 'o', 'O', 'Other', '3'],
    },
  },

  contact: {
    dataKey: 'contact',
    matches: [
      'contact', 'Contact', 'phone', 'Phone', 'mobile', 'Mobile',
      'phoneNumber', 'phone_number', 'PhoneNumber',
      'mobileNumber', 'mobile_number', 'MobileNumber',
      'contactNumber', 'contact_number', 'ContactNumber',
      'cellPhone', 'cellphone', 'cell_phone',
    ],
    labels: ['contact', 'phone', 'mobile', 'phone number', 'mobile number', 'contact number'],
  },

  alternativeContact: {
    dataKey: 'alternativeContact',
    matches: [
      'alternativeContact', 'alternative_contact', 'AlternativeContact',
      'altContact', 'alt_contact', 'AltContact',
      'alternatePhone', 'alternate_phone',
      'parentContact', 'parent_contact', 'ParentContact',
      'guardianContact', 'guardian_contact', 'GuardianContact',
      'parentPhone', 'parent_phone', 'ParentPhone',
    ],
    labels: ['alternative contact', 'alt contact', 'parent contact', 'guardian contact', 'parent phone'],
  },

  email: {
    dataKey: 'email',
    type: 'email',
    matches: [
      'email', 'Email', 'emailAddress', 'email_address', 'EmailAddress',
      'eMail', 'e-mail', 'E-Mail', 'mail',
    ],
    labels: ['email', 'email address', 'e-mail', 'mail'],
  },

  aadhaarNumber: {
    dataKey: 'aadhaarNumber',
    matches: [
      'aadhaarNumber', 'aadhaar_number', 'AadhaarNumber',
      'aadhaar', 'Aadhaar', 'aadhar', 'Aadhar',
      'aadharNumber', 'aadhar_number', 'AadharNumber',
      'uid', 'UID', 'uidNumber', 'uid_number',
    ],
    labels: ['aadhaar', 'aadhaar number', 'aadhar', 'uid', 'aadhaar number'],
  },

  className: {
    dataKey: 'className',
    matches: [
      'className', 'class_name', 'ClassName', 'Class',
      'class', 'standard', 'Standard', 'grade', 'Grade',
      'classSection', 'class_section',
    ],
    labels: ['class', 'className', 'standard', 'grade', 'section'],
  },

  section: {
    dataKey: 'section',
    matches: [
      'section', 'Section', 'division', 'Division',
    ],
    labels: ['section', 'division'],
  },

  rollNumber: {
    dataKey: 'rollNumber',
    matches: [
      'rollNumber', 'roll_number', 'RollNumber',
      'rollNo', 'roll_no', 'RollNo',
      'roll', 'Roll',
    ],
    labels: ['roll number', 'roll no', 'roll'],
  },

  studentId: {
    dataKey: 'studentId',
    matches: [
      'studentId', 'student_id', 'StudentId', 'StudentID',
      'enrollmentId', 'enrollment_id', 'EnrollmentId',
      'admissionNo', 'admission_no', 'AdmissionNo',
    ],
    labels: ['student id', 'enrollment id', 'admission no', 'student number'],
  },

  employeeId: {
    dataKey: 'employeeId',
    matches: [
      'employeeId', 'employee_id', 'EmployeeId', 'EmployeeID',
      'empId', 'emp_id', 'EmpId',
      'staffId', 'staff_id', 'StaffId',
    ],
    labels: ['employee id', 'emp id', 'staff id'],
  },

  addressLine1: {
    dataKey: 'addressLine1',
    matches: [
      'addressLine1', 'address_line1', 'AddressLine1',
      'address', 'Address', 'fullAddress', 'full_address',
      'address1', 'Address1', 'streetAddress', 'street_address',
      'permanent address', 'permanentAddress',
    ],
    labels: ['address', 'full address', 'street address', 'address line 1', 'permanent address'],
  },

  addressCity: {
    dataKey: 'addressCity',
    matches: [
      'addressCity', 'address_city', 'city', 'City',
      'town', 'Town', 'townCity', 'town_city',
    ],
    labels: ['city', 'town', 'city/town'],
  },

  addressState: {
    dataKey: 'addressState',
    matches: [
      'addressState', 'address_state', 'state', 'State',
      'province', 'Province',
    ],
    labels: ['state', 'province'],
  },

  addressDistrict: {
    dataKey: 'addressDistrict',
    matches: [
      'addressDistrict', 'address_district', 'district', 'District',
    ],
    labels: ['district'],
  },

  addressPincode: {
    dataKey: 'addressPincode',
    matches: [
      'addressPincode', 'address_pincode', 'pincode', 'Pincode',
      'zip', 'Zip', 'zipCode', 'zip_code', 'ZipCode',
      'postalCode', 'postal_code', 'PostalCode',
      'postCode', 'post_code',
    ],
    labels: ['pincode', 'zip', 'zip code', 'postal code', 'post code'],
  },

  employeeType: {
    dataKey: 'employeeType',
    matches: [
      'employeeType', 'employee_type', 'EmployeeType',
      'designation', 'Designation', 'jobTitle', 'job_title',
      'role', 'Role', 'position', 'Position',
      'department', 'Department',
    ],
    labels: ['employee type', 'designation', 'job title', 'role', 'position', 'department'],
  },

  bloodGroup: {
    dataKey: 'bloodGroup',
    matches: [
      'bloodGroup', 'blood_group', 'BloodGroup', 'blood', 'Blood',
    ],
    labels: ['blood group', 'blood type'],
  },

  admissionDate: {
    dataKey: 'admissionDate',
    type: 'date',
    matches: [
      'admissionDate', 'admission_date', 'AdmissionDate',
      'enrollmentDate', 'enrollment_date', 'EnrollmentDate',
      'joiningDate', 'joining_date', 'JoiningDate',
      'dateOfAdmission', 'date_of_admission',
    ],
    labels: ['admission date', 'enrollment date', 'joining date', 'date of admission'],
  },
};

// Build a reverse lookup for quick field matching
function buildFieldIndex() {
  const index = {};
  for (const [fieldKey, config] of Object.entries(FIELD_MAP)) {
    for (const match of config.matches) {
      const normalizedKey = match.toLowerCase().replace(/[_\-\s]/g, '');
      if (!index[normalizedKey]) {
        index[normalizedKey] = fieldKey;
      }
    }
  }
  return index;
}

const FIELD_INDEX = buildFieldIndex();
