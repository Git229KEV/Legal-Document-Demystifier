import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = () => {
  // State to toggle between Login and Signup
  const [isLoginView, setIsLoginView] = useState(true);

  // --- NEW: State for the login form data ---
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  // State for the signup form data
  const [signupData, setSignupData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    age: '',
    source: ''
  });

  // State for the age validation error
  const [ageError, setAgeError] = useState('');

  // --- NEW: Generic handler for input changes ---
  // This single function can now handle both login and signup form changes.
  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === 'signup') {
      setSignupData(prevData => ({
        ...prevData,
        [name]: value
      }));
      // Clear age error when user modifies the age field
      if (name === 'age') {
        setAgeError('');
      }
    } else {
      setLoginData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };
  
  // Handler for signup form submission
  const handleSignupSubmit = (e) => {
    e.preventDefault();
    const age = parseInt(signupData.age, 10);
    if (age < 18) {
      setAgeError("You're not eligible for using this site");
      return;
    }
    setAgeError('');
    console.log("Signup form submitted:", signupData);
    // Add your signup logic here (e.g., API call)
  };

  // Handler for login form submission
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    console.log("Login form submitted:", loginData); // Now you can access login data
    // Add your login logic here
  };


  return (
    <div className="auth-container">
      <div className={`form-flipper ${!isLoginView ? 'show-signup' : ''}`}>
        
        {/* Login Form - UPDATED with value and onChange */}
        <div className="form-wrapper login-form">
          <form onSubmit={handleLoginSubmit}>
            <h2>Login</h2>
            <div className="form-group">
              <label htmlFor="login-email">Email ID</label>
              <input 
                type="email" 
                id="login-email" 
                name="email" // Added name attribute
                value={loginData.email} 
                onChange={(e) => handleInputChange(e, 'login')}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input 
                type="password" 
                id="login-password" 
                name="password" // Added name attribute
                value={loginData.password} 
                onChange={(e) => handleInputChange(e, 'login')}
                required 
              />
            </div>
            <button type="submit" className="btn">Login</button>
            <p className="toggle-text">
              Don't have an account?{' '}
              <span onClick={() => setIsLoginView(false)}>Sign Up</span>
            </p>
          </form>
        </div>

        {/* Signup Form - UPDATED to use the generic handler */}
        <div className="form-wrapper signup-form">
          <form onSubmit={handleSignupSubmit}>
            <h2>Sign Up</h2>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input type="text" id="name" name="name" value={signupData.name} onChange={(e) => handleInputChange(e, 'signup')} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" value={signupData.phone} onChange={(e) => handleInputChange(e, 'signup')} required />
            </div>
            <div className="form-group">
              <label htmlFor="signup-email">Email ID</label>
              <input type="email" id="signup-email" name="email" value={signupData.email} onChange={(e) => handleInputChange(e, 'signup')} required />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input type="password" id="signup-password" name="password" value={signupData.password} onChange={(e) => handleInputChange(e, 'signup')} required />
            </div>
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input type="number" id="age" name="age" value={signupData.age} onChange={(e) => handleInputChange(e, 'signup')} required />
              {ageError && <p className="error-message">{ageError}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="source">How did you hear about us?</label>
              <select id="source" name="source" value={signupData.source} onChange={(e) => handleInputChange(e, 'signup')} required>
                <option value="" disabled>Select an option</option>
                <option value="social-media">Social Media</option>
                <option value="friend">From a friend</option>
                <option value="search-engine">Search Engine (Google, etc.)</option>
                <option value="advertisement">Advertisement</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn">Sign Up</button>
            <p className="toggle-text">
              Already have an account?{' '}
              <span onClick={() => setIsLoginView(true)}>Login</span>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;