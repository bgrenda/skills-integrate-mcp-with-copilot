# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Publicly view activity rosters
- Teacher sign-in to register or unregister students

## Teacher Accounts

Teacher credentials are stored in `src/teachers.json`, which is excluded from Git. Add an account with:

```sh
python src/manage_teachers.py add teacher@mergington.edu "Teacher Name"
```

The command prompts for a password (minimum 12 characters) and stores a salted PBKDF2 hash, not the password itself. On POSIX systems, it restricts the credential file to the owner. Set `TEACHERS_FILE` to use a different path; use a private file location when deploying.

Teachers sign in from the website. The API issues an eight-hour bearer token held in server memory; restarting the server invalidates active sessions. `GET /activities` remains public, while `POST /activities/{activity_name}/signup` and `DELETE /activities/{activity_name}/unregister` require a teacher token. Use HTTPS outside local development.

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Public activity details and participant roster                      |
| POST   | `/auth/login`                                                      | Sign in as a teacher and receive a bearer token                      |
| GET    | `/auth/me`                                                         | Get the signed-in teacher profile (bearer token required)            |
| POST   | `/auth/logout`                                                     | Revoke the current teacher session (bearer token required)            |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Register a student (teacher bearer token required)                   |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Unregister a student (teacher bearer token required)               |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
