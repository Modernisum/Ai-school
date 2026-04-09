# Run Project Commands

When user says "run project" or similar, execute these commands in order:

1. Start Qdrant vector database (if not already running)
```bash
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

2. Start Backend server
```bash
cd Backend && cargo run --bin modern_school_backend
```

3. Start SuperAdmin frontend
```bash
cd frontend/SuperAdmin && npm run dev
```

4. Start Vidhyam frontend
```bash
cd frontend/Vidhyam && npm run dev
```


5. Start Android emulator
```bash
flutter emulators --launch Pixel_9a
```

6. Run Chatra app
```bash
cd Apps/chatra && flutter run
```

7. Run Employee app
```bash
cd Apps/employee && flutter run
```

Verification commands (after starting):
- Check Qdrant: `curl -s -o /dev/null -w "%{http_code}" http://localhost:6333`
- Check Backend: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080`
- Check SuperAdmin: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001`
- Check Vidhyam: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5174`
- check employee app: `emulators --launch Pixel_9a`
- check chatra app: `emulators --launch Pixel_9a`

If any service fails, check logs and restart.