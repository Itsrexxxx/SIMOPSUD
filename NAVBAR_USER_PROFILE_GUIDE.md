# Navbar User Profile Implementation - Complete Guide

## 🎯 Overview
Navbar profile section has been updated from static data to **dynamic user data** from authentication context. The profile now displays the logged-in user's actual information.

---

## 📁 Files Created

### 1. `frontend/src/context/UserContext.jsx`
Global user state management using React Context API.

**Key Features:**
```javascript
// Hook to access user context anywhere in app
const { user, login, logout, updateUser, hasRole, getInitials } = useUser();

// Available methods:
login(userData, token)        // Save user & token
logout()                       // Clear user & token
updateUser(userData)           // Update user profile
hasRole(role)                 // Check if user has role
hasAnyRole(roles)             // Check if user has any role
isApproved()                  // Check approval status
getDisplayName()              // Get user's full name
getInitials()                 // Get initials (e.g., "RR" for Reykel Raflen)
```

**Data Structure:**
```javascript
user = {
  id: 1,
  username: "pilot_001",
  full_name: "Mayor Tek. Reykel Raflen",
  nip: "12-001-2023",
  service_unit: "Skadron Udara 3",
  role: "Administrator",      // or "Analyst" or "Executive"
  is_approved: true,
  avatar_url: null            // Optional: URL to user's avatar image
}
```

### 2. `frontend/src/services/authService.js`
API client with JWT token handling for backend integration.

**Authentication API:**
```javascript
// User registration & login
await authService.register(userData)
await authService.login(username, password)
await authService.logout()
await authService.getCurrentUser()
await authService.refreshToken()
await authService.updateProfile(userData)
await authService.changePassword(oldPassword, newPassword)

// Admin operations (from RBAC system)
await userAdminService.getPendingUsers(skip, limit)
await userAdminService.getAllUsers(skip, limit)
await userAdminService.approveUser(userId, roleData)
await userAdminService.rejectUser(userId)
await userAdminService.getPendingStats()
```

**Features:**
- Automatic JWT token injection in all requests
- Automatic 401 redirect to login on unauthorized
- Request/response interceptors for error handling
- Configurable API base URL via `VITE_API_URL` env var

---

## 📝 Files Modified

### 1. `frontend/src/App.jsx`
```javascript
// ✅ NEW: Import UserProvider
import { UserProvider } from './context/UserContext';

// ✅ NEW: Wrap entire app with UserProvider
export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        {/* Routes */}
      </BrowserRouter>
    </UserProvider>
  );
}
```

### 2. `frontend/src/components/Navbar.jsx`
**BEFORE:**
```javascript
// ❌ Static data
<p className="profile-name">Mayor Tek. Reykel</p>
<p className="profile-role">Officer In Command</p>
<img src="/logo_au.png" alt="Mayor Tek. Reykel" />
```

**AFTER:**
```javascript
// ✅ Dynamic data from context
import { useUser } from '../context/UserContext';

const { user, getInitials } = useUser();

// Display user's actual name and role
<p className="profile-name">{user?.full_name || 'User'}</p>
<p className="profile-role">{getRoleDisplay(user?.role)}</p>

// Avatar with fallback initials
{user?.avatar_url ? (
  <img src={user.avatar_url} alt={user.full_name} />
) : (
  <div className="avatar-initials">
    {getInitials()}  // Shows initials like "RR", "BP", etc.
  </div>
)}
```

**Role Display Mapping:**
```javascript
"Administrator"  →  "System Administrator"
"Analyst"        →  "AI Analyst / Operator"
"Executive"      →  "Commander / Executive"
```

### 3. `frontend/src/index.css`
Added comprehensive styling for profile card:

```css
.profile-card              // Main profile container
.profile-meta              // Name & role section
.profile-name              // User's full name
.profile-role              // User's role display
.profile-avatar            // Avatar image container
.avatar-initials           // Fallback initials display
.icon-button               // Notification icon button
.notification-dot          // Red pulse dot for notifications
```

**Design Features:**
- Gradient background for avatar (Navy → Cyan)
- Hover effects with shadow and color change
- Pulse animation on notification dot
- Responsive and accessible design

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────┐
│           User Logs In (Frontend)              │
│     username: "pilot_001", password: "xxx"     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│    authService.login(username, password)        │
│  POST /api/v1/auth/login                       │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│      Backend Returns:                            │
│  {                                               │
│    "access_token": "jwt_token_here",            │
│    "user": {                                     │
│      "id": 1,                                    │
│      "username": "pilot_001",                   │
│      "full_name": "Mayor Tek. Reykel Raflen",  │
│      "nip": "12-001-2023",                      │
│      "role": "Administrator",                   │
│      "is_approved": true,                       │
│      "service_unit": "Skadron Udara 3"         │
│    }                                             │
│  }                                               │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  UserContext.login(userData, token)             │
│  - Save token to localStorage                    │
│  - Save user data to localStorage               │
│  - Update user state                            │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│       Navbar Component (via useUser())          │
│   Accesses and displays:                        │
│   - user.full_name                              │
│   - user.role (with mapping)                    │
│   - user.avatar_url or initials                 │
└──────────────────────────────────────────────────┘
```

---

## 🚀 Usage Examples

### Example 1: Display User Info in Any Component
```javascript
import { useUser } from '../context/UserContext';

function MyComponent() {
  const { user, hasRole, getDisplayName, getInitials } = useUser();
  
  return (
    <div>
      <h1>Welcome, {getDisplayName()}!</h1>
      <p>Role: {user?.role}</p>
      <p>Unit: {user?.service_unit}</p>
      
      {hasRole('Administrator') && (
        <button>Admin Panel</button>
      )}
    </div>
  );
}
```

### Example 2: Handle Login
```javascript
import { useUser } from '../context/UserContext';
import { authService } from '../services/authService';

function LoginForm() {
  const { login } = useUser();
  
  const handleLogin = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      // Save user & token to context
      login(response.user, response.access_token);
      // Redirect to dashboard
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  return (/* form JSX */);
}
```

### Example 3: Admin-Only Component
```javascript
import { useUser } from '../context/UserContext';

function AdminPanel() {
  const { hasRole, user } = useUser();
  
  if (!hasRole('Administrator')) {
    return <div>Access Denied</div>;
  }
  
  return (
    <div>
      <h1>Administrator Panel</h1>
      <p>Logged in as: {user?.full_name}</p>
      {/* Admin content */}
    </div>
  );
}
```

### Example 4: Logout
```javascript
import { useUser } from '../context/UserContext';
import { authService } from '../services/authService';

function LogoutButton() {
  const { logout } = useUser();
  
  const handleLogout = async () => {
    await authService.logout();
    logout(); // Clear context
    navigate('/login');
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## 🎨 Profile Card Styling

The profile card now includes:

```css
/* Profile Card Container */
.profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--border-soft);
  transition: all 0.3s ease;
}

.profile-card:hover {
  background: var(--surface-container);
  border-color: var(--secondary);    /* Navy Blue */
  box-shadow: 0 4px 12px rgba(0, 99, 152, 0.15);
}

/* Avatar with Gradient Fallback */
.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #00236f, #006398);  /* Navy to Cyan */
  color: white;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.9rem;
}
```

---

## 📋 Next Steps for Backend Integration

### 1. Implement Login Endpoint
File: `backend/backend/app/api/v1/endpoints/auth.py`

```python
@router.post("/login", response_model=dict)
def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    """
    Login endpoint.
    Returns: {
        "access_token": "jwt_token",
        "user": UserOut schema
    }
    """
    user = crud_user.get_user_by_username(db, credentials.username)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="User not approved yet")
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "user": user
    }
```

### 2. Create JWT Token Utilities
File: `backend/backend/app/core/security.py`

```python
from jose import JWTError, jwt
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

### 3. Create Token Dependency
File: `backend/backend/app/api/deps.py`

```python
def get_current_user(token: str = Depends(HTTPBearer())) -> dict:
    """Verify JWT token and return user context."""
    payload = verify_token(token.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload
```

### 4. Environment Variables
Create `.env` file:
```env
# Frontend
VITE_API_URL=http://localhost:8000/api/v1

# Backend
DATABASE_URL=postgresql://user:password@localhost/simko
JWT_SECRET_KEY=your-super-secret-key-here
JWT_ALGORITHM=HS256
```

---

## ✅ Validation Checklist

- [ ] UserContext created and provides user data
- [ ] App.jsx wrapped with UserProvider
- [ ] Navbar displays dynamic user name
- [ ] Navbar displays mapped role name
- [ ] Avatar shows initials with gradient fallback
- [ ] Profile card has hover effects
- [ ] Notification dot pulses
- [ ] authService configured with base URL
- [ ] JWT token interceptor working
- [ ] Login endpoint implemented on backend
- [ ] User data returned from login endpoint
- [ ] Tokens persist in localStorage
- [ ] Page refresh maintains user session

---

## 🐛 Troubleshooting

### Issue: "Profile shows 'User'" 
**Solution:** User context is null. Check:
1. Is UserProvider wrapping the app in App.jsx?
2. Did login save user data to context?
3. Check localStorage for 'user' key

### Issue: "Initials show but no gradient"
**Solution:** Check that avatar-initials CSS class is applied:
```css
.avatar-initials {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: var(--on-primary);
}
```

### Issue: "Token not sent in requests"
**Solution:** Check authService interceptor:
```javascript
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 📚 File Structure
```
frontend/
├── src/
│   ├── context/
│   │   └── UserContext.jsx          ✅ NEW
│   ├── services/
│   │   └── authService.js           ✅ NEW
│   ├── components/
│   │   └── Navbar.jsx               ✏️ UPDATED
│   ├── App.jsx                      ✏️ UPDATED
│   └── index.css                    ✏️ UPDATED (added profile styles)
│
backend/
├── app/
│   ├── models/
│   │   └── user.py                  ✅ Created (RBAC)
│   ├── schemas/
│   │   └── user_schema.py           ✅ Created (RBAC)
│   ├── crud/
│   │   └── crud_user.py             ✅ Created (RBAC)
│   └── api/v1/endpoints/
│       ├── users.py                 ✅ Created (RBAC)
│       └── auth.py                  ⏳ TODO: Create login endpoint
```

---

**Status**: ✅ Frontend Complete | **Next**: Backend login endpoint

Generated: August 13, 2026
