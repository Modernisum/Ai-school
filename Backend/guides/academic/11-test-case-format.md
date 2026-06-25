# Academic API Test Case Format

Academic API docs ke har ek endpoint test case ke liye is format ka use karein.

```md
### Test Case: <short name>

- Type: positive / negative / boundary / workflow / tenant-isolation
- Preconditions:
- Request:
  - Method:
  - Route:
  - Headers/Auth:
  - Body/Query:
- Expected HTTP status:
- Expected response:
- Database/state assertion:
- Notes:
```

## Recommended test-case categories

### Positive happy path

Yeh confirm karta hai ki endpoint valid data ke sath sahi work karta hai aur documented success response return karta hai.

### Missing required field

Yeh confirm karta hai ki jab required fields absent hon, toh validation cleanly fail ho jaye.

### Invalid path parameter

Yeh missing, malformed, ya non-existent IDs ke liye behavior confirm karta hai.

### Tenant isolation

Yeh confirm karta hai ki request ka scope tenant/school tak hi limited rahe aur yeh kisi dusre school ke data ko read ya mutate na kar sake.

### Workflow state violation

Yeh confirm karta hai ki invalid workflow transitions block ho jayein, jaise ki:

- Teacher approval ke baad checker review.
- Publish ke baad teacher approve/reject.
- Conflicts ke sath timetable approve karna.
- Active timetable delete karna.

### Boundary value

Yeh limits confirm karta hai, jaise ki:

- OMR question count 5 ka multiple hona chahiye.
- OMR/announced test date kam se kam 3 days future me honi chahiye.
- Timetable day/period values valid honi chahiye.
- Exam marks section max marks se exceed nahi karne chahiye.

### Empty list

Yeh confirm karta hai ki list endpoints fail hone ke bajaye ek safe empty array return karein.

### Idempotency/update behavior

Yeh confirm karta hai ki update/upsert endpoints tab predictably behave karein jab same record ko dubara submit kiya jaye.
