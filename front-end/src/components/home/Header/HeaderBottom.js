import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FaSearch, FaShoppingCart, FaExchangeAlt } from "react-icons/fa";
import { FiUser, FiShoppingBag, FiMessageSquare, FiLogOut } from "react-icons/fi";
import { IoStorefrontOutline } from "react-icons/io5";
import { MdOutlineHistory, MdOutlineRateReview, MdOutlineLocalShipping } from "react-icons/md";
import { RiUserSettingsLine, RiHomeSmileLine, RiShieldLine } from "react-icons/ri";
import Flex from "../../designLayouts/Flex";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import Image from "../../designLayouts/Image";
import {
  resetUserInfo,
  setUserInfo,
  setProducts,
  calculateCartTotalCount,
} from "../../../redux/orebiSlice";

const HeaderBottom = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const ref = useRef();

  // Get authentication info from Redux store
  const authState = useSelector(state => state.auth);
  const isAuthenticated = authState?.isAuthenticated || false;
  const user = authState?.user || null;

  // Get data from Redux store with safe checks
  const orebiReducer = useSelector((state) => state.orebiReducer) || {};
  const products = orebiReducer.products || [];
  
  // Get chat unread count
  const chatState = useSelector((state) => state.chat);
  const chatNotifications = chatState?.conversations?.reduce((count, conv) => count + (conv.unreadCount || 0), 0) || 0;
  
  // Get cart information from Redux store
  const cartState = useSelector((state) => state.cart) || {};
  const cartItems = cartState.items || [];
  
  // Calculate total items in cart
  const cartTotalCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const [showUser, setShowUser] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [userName, setUserName] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'));
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:9999";

  // Fetch products function
  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products`);
      // Update to match backend model
      const formattedProducts = response.data.data.map(product => ({
        ...product,
        name: product.title, // Backend uses 'title' field for product names
        image: product.image
      }));
      
      dispatch(setProducts(formattedProducts));
      setAllProducts(formattedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }, [API_BASE_URL, dispatch]);

  // Fetch user data function
  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoggedIn(false);
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUserName(response.data.fullname || response.data.username);
      dispatch(setUserInfo(response.data));
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      if (error.response && error.response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('accessToken');
        setIsLoggedIn(false);
      }
    }
  }, [API_BASE_URL, dispatch]);

  // Effect to check login status whenever component renders
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);
  }, []);

  // Effect to load data when component mounts
  useEffect(() => {
    fetchProducts();
    
    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn, fetchProducts, fetchUserData, dispatch]);

  // Handle clicks outside user menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowUser(false);
      }
    };

    document.body.addEventListener("click", handleClickOutside);
    return () => document.body.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter products when search query changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();

        if (Array.isArray(data)) {
          // Map dữ liệu API → đồng bộ field
          const mapped = data.map((item) => ({
            ...item,
            name: item.title || item.name || "Untitled Product",
          }));

          setAllProducts(mapped);
          dispatch(setProducts(mapped));
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, [dispatch]);

  // Lọc sản phẩm mỗi khi searchQuery thay đổi
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts([]);
      return;
    }

    const filtered = allProducts
      .filter((item) =>
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .map((item) => ({
        _id: item._id,
        image: item.image,
        name: item.name,
        price: item.price,
        description: item.description,
        category: item.categoryId?.name || "",
        seller: item.sellerId?.username || "",
      }));

    setFilteredProducts(filtered);
  }, [searchQuery, allProducts]);

  const handleSearch = (e) => {
  setSearchQuery(e.target.value);
};

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`${API_BASE_URL}/api/logout`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      localStorage.removeItem('accessToken');
      dispatch(resetUserInfo());
      setIsLoggedIn(false);
      setUserName(null);
      navigate('/signin');
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear the token on the client side even if the API call fails
      localStorage.removeItem('accessToken');
      setIsLoggedIn(false);
      setUserName(null);
      navigate('/signin');
    }
  };

  const getProductImage = (item) => {
    if (!item.image) {
      return "https://via.placeholder.com/100?text=No+Image";
    }
    
    if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
      return item.image;
    } else {
      return `${API_BASE_URL}/uploads/${item.image}`;
    }
  };

  return (
    <div className="w-full bg-white border-b border-gray-200 relative shadow-sm">
  <div className="max-w-container mx-auto">
    <Flex className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full px-4 pb-4 lg:pb-0 h-full lg:h-20">
      {/* Brand Name */}
      <div className="flex h-14 items-center gap-2">
        <Link to="/">
          <div className="flex items-center">
            <IoStorefrontOutline className="text-3xl text-[#e53238] mr-2" />
            <p className="text-[24px] font-bold text-gray-800 tracking-wider hover:text-[#0064d2] transition-colors">
              Ebay
            </p>
          </div>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative w-full lg:w-[600px] h-[50px] text-base bg-white flex items-center gap-2 justify-between px-6 rounded-xl overflow-hidden shadow border border-gray-300">
        <input
          className="flex-1 h-full outline-none placeholder:text-gray-500 placeholder:text-[14px]"
          type="text"
          onChange={handleSearch}
          value={searchQuery}
          placeholder="Search products..."
        />
        <FaSearch className="w-5 h-5 text-[#0064d2] cursor-pointer" />

        {searchQuery && filteredProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full mx-auto max-h-96 bg-white top-16 absolute left-0 z-50 overflow-y-auto shadow-2xl scrollbar-thin scrollbar-thumb-gray-300 cursor-pointer rounded-lg"
          >
            {filteredProducts.map((item) => (
              <div
                key={item._id}
                onClick={() => {
                  navigate(`/product/${item._id}`, { state: { item } });
                  setSearchQuery("");
                }}
                className="max-w-[600px] h-28 bg-gray-50 mb-2 flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors border-b border-gray-100"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={getProductImage(item)}
                    alt={item.name}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/100?text=No+Image";
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-lg truncate text-[#0064d2]">{item.name}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {item.description || "No description available"}
                  </p>
                  <p className="text-sm font-medium">
                    Price:{" "}
                    <span className="text-[#0064d2] font-semibold">
                      ${item.price?.toFixed(2) || "0.00"}
                    </span>
                  </p>
                  {item.category && (
                    <p className="text-xs text-gray-500">Category: {item.category}</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* User Actions */}
      <div className="flex gap-8 mt-2 lg:mt-0 items-center pr-6 cursor-pointer relative">
        {/* Chat icon */}
        {isAuthenticated && (
          <Link to="/chat" className="text-gray-800 hover:text-black transition-colors">
            <div className="flex flex-col items-center relative group">
              <div className="bg-blue-500 rounded-full p-2 group-hover:bg-gray-300 transition-all">
                <FiMessageSquare className="text-xl" />
              </div>
              {chatNotifications > 0 && (
                <span className="absolute -top-1 -right-1 text-xs w-5 h-5 flex items-center justify-center rounded-full bg-[#e53238] text-white font-bold">
                  {chatNotifications}
                </span>
              )}
              <span className="text-xs mt-1 font-medium">Chat</span>
            </div>
          </Link>
        )}
        
        {/* User dropdown */}
        <div 
          ref={ref}
          onClick={() => setShowUser(!showUser)} 
          className="text-gray-800 hover:text-black transition-colors"
        >
          <div className="flex flex-col items-center group">
            <div className="bg-blue-500 rounded-full p-2 group-hover:bg-gray-300 transition-all">
              <FiUser className="text-xl" />
            </div>
            <span className="text-xs mt-1 font-medium">Account</span>
          </div>
          
          {showUser && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute top-16 right-0 z-50 bg-white w-64 text-[#262626] rounded-lg shadow-2xl p-4"
            >
              {isAuthenticated ? (
                <>
                  {userName && (
                    <div className="text-[#0064d2] font-medium py-2 border-b border-gray-200 mb-2 flex items-center">
                      <FiUser className="mr-2 text-lg" />
                      Hello, {userName}
                    </div>
                  )}
                  <Link to="/order-history" onClick={() => setShowUser(false)}>
                    <div className="py-2 hover:bg-blue-50 px-3 rounded transition-colors flex items-center gap-3">
                      <MdOutlineHistory className="text-[#0064d2] text-lg" />
                      Order History
                    </div>
                  </Link>
                  <Link to="/profile" onClick={() => setShowUser(false)}>
                    <div className="py-2 hover:bg-blue-50 px-3 rounded transition-colors flex items-center gap-3">
                      <RiUserSettingsLine className="text-[#0064d2] text-lg" />
                      Profile
                    </div>
                  </Link>
                  <Link to="/address" onClick={() => setShowUser(false)}>
                    <div className="py-2 hover:bg-blue-50 px-3 rounded transition-colors flex items-center gap-3">
                      <RiHomeSmileLine className="text-[#0064d2] text-lg" />
                      Addresses
                    </div>
                  </Link>
                  <Link to="/my-reviews" onClick={() => setShowUser(false)}>
                    <div className="py-2 hover:bg-blue-50 px-3 rounded transition-colors flex items-center gap-3">
                      <MdOutlineRateReview className="text-[#0064d2] text-lg" />
                      Reviews
                    </div>
                  </Link>
                  <Link to="/disputes" onClick={() => setShowUser(false)}>
                    <div className="py-2 hover:bg-blue-50 px-3 rounded transition-colors flex items-center gap-3">
                      <RiShieldLine className="text-[#0064d2] text-lg" />
                      Disputes
                    </div>
                  </Link>
                  <Link to="/return-requests" onClick={() => setShowUser(false)}>
                    <div className="py-2 hover:bg-blue-50 px-3 rounded transition-colors flex items-center gap-3">
                      <FaExchangeAlt className="text-[#0064d2] text-lg" />
                      Return Requests
                    </div>
                  </Link>
                  <div 
                    onClick={handleLogout}
                    className="py-2 mt-2 hover:bg-red-50 px-3 rounded transition-colors flex items-center gap-3 border-t border-gray-200 pt-3 text-red-600"
                  >
                    <FiLogOut className="text-lg" />
                    Logout
                  </div>
                </>
              ) : (
                <>
                  <Link to="/signin" onClick={() => setShowUser(false)}>
                    <div className="py-3 bg-[#0064d2] hover:bg-[#0047a3] text-white px-3 rounded-lg transition-colors text-center font-medium">
                      Sign In
                    </div>
                  </Link>
                  <Link to="/signup" onClick={() => setShowUser(false)}>
                    <div className="py-3 border border-[#0064d2] text-[#0064d2] hover:bg-blue-50 px-3 rounded-lg transition-colors mt-3 text-center font-medium">
                      Sign Up
                    </div>
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </div>
        
        {/* Shopping Cart */}
        <Link to="/cart" className="relative text-gray-800 hover:text-black transition-colors">
          <div className="flex flex-col items-center group">
            <div className="relative bg-blue-500 rounded-full p-2 group-hover:bg-gray-300 transition-all">
              <FiShoppingBag className="text-xl" />
              {cartTotalCount > 0 && (
                <span className="absolute -top-1 -right-1 text-xs w-5 h-5 flex items-center justify-center rounded-full bg-[#e53238] text-white font-bold">
                  {cartTotalCount}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 font-medium">Cart</span>
          </div>
        </Link>
      </div>
    </Flex>
  </div>
</div>

  );
};

export default HeaderBottom;