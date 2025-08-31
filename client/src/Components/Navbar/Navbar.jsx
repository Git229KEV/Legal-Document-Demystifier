import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Navbar.css';
import logo from '../../assets/logo.png';

const Navbar = () => {
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav className={`container ${sticky ? 'dark-nav' : ''}`}>
      <img src={logo} alt="Logo" className="logo" />
      <ul>
        <li>Home</li>
        <li>Stories</li>
        <li>Document Scanner</li>
        <li>About Us</li>
        <li>
          <Link to="/auth" className="btn">Login</Link>
        </li>

      </ul>
    </nav>
  );
};

export default Navbar;
