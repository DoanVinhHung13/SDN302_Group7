import axios from "axios";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiMessageSquare, FiShoppingBag, FiUser } from "react-icons/fi";
import { HiMenuAlt2 } from "react-icons/hi";
import { MdKeyboardArrowDown } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../../../features/auth/authSlice";
import {
  resetUserInfo,
  setProducts,
  setUserInfo,
} from "../../../redux/orebiSlice";

const Header = () => {
  const [showMenu, setShowMenu] = useState(true);
  const [sidenav, setSidenav] = useState(false);
  const [category, setCategory] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("accessToken")
  );
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const ref = useRef();
  const categoryRef = useRef();

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:9999";
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const orebiReducer = useSelector((state) => state.orebiReducer) || {};
  const products = orebiReducer.products || [];
  const chatState = useSelector((state) => state.chat);
  const chatNotifications =
    chatState?.conversations?.reduce(
      (count, conv) => count + (conv.unreadCount || 0),
      0
    ) || 0;

  const cartState = useSelector((state) => state.cart) || {};
  const cartItems = cartState.items || [];

  const cartTotalCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const categories = [
    "All Categories",
    "Electronics",
    "Fashion",
    "Home & Garden",
    "Motors",
    "Sports",
    "Books",
    "Health & Beauty",
    "Toys & Games",
  ];

  useEffect(() => {
    let ResponsiveMenu = () => {
      if (window.innerWidth < 1024) {
        setShowMenu(false);
      } else {
        setShowMenu(true);
      }
    };
    ResponsiveMenu();
    window.addEventListener("resize", ResponsiveMenu);

    return () => {
      window.removeEventListener("resize", ResponsiveMenu);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowUser(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategories(false);
      }
    };

    document.body.addEventListener("click", handleClickOutside);
    return () => document.body.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLoggedIn(!!token);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products`);
      const formattedProducts = response.data.data.map((product) => ({
        ...product,
        name: product.title,
        image: product.image,
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
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserName(response.data.fullname || response.data.username);
      dispatch(setUserInfo(response.data));
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
      }
    }
  }, [API_BASE_URL, dispatch]);

  useEffect(() => {
    fetchProducts();

    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn, fetchProducts, fetchUserData]);

  useEffect(() => {
    const filtered = allProducts
      .filter(
        (item) =>
          (item.title &&
            item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.name &&
            item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.description &&
            item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .map((item) => ({
        _id: item._id,
        image: item.image,
        name: item.name || item.title || "Untitled Product",
        price: item.price,
        description: item.description,
        category: item.categoryId?.name || "",
        seller: item.sellerId?.username || "",
      }));

    setFilteredProducts(filtered);
  }, [searchQuery, allProducts]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(`${API_BASE_URL}/api/logout`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      localStorage.removeItem("accessToken");
      dispatch(resetUserInfo());
      dispatch(logout());
      setIsLoggedIn(false);
      setUserName(null);
      setSidenav(false);
      navigate("/signin");
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.removeItem("accessToken");
      dispatch(logout());
      setIsLoggedIn(false);
      setUserName(null);
      setSidenav(false);
      navigate("/signin");
    }
  };

  const handleBecomeASeller = () => {
    navigate("/store-registration");
    setSidenav(false);
    setShowUser(false);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const getProductImage = (item) => {
    if (!item.image) {
      return "https://via.placeholder.com/100?text=No+Image";
    }

    if (item.image.startsWith("http://") || item.image.startsWith("https://")) {
      return item.image;
    } else {
      return `${API_BASE_URL}/uploads/${item.image}`;
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategories(false);
  };

  return (
    <div className="w-full bg-white sticky top-0 z-50 border-b border-gray-200">
      {/* Top Navigation Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-10 text-sm">
            <div className="flex items-center space-x-6">
              <Link to="/deals" className="text-gray-600 hover:text-blue-600">
                Daily Deals
              </Link>
              <Link to="/outlet" className="text-gray-600 hover:text-blue-600">
                Brand Outlet
              </Link>
              <Link to="/help" className="text-gray-600 hover:text-blue-600">
                Help & Contact
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              {isAuthenticated && user?.role === "buyer" && (
                <button
                  onClick={handleBecomeASeller}
                  className="text-gray-600 hover:text-blue-600"
                >
                  Sell
                </button>
              )}
              {isAuthenticated && (
                <Link
                  to="/watchlist"
                  className="text-gray-600 hover:text-blue-600 flex items-center"
                >
                  Watchlist <MdKeyboardArrowDown className="ml-1" />
                </Link>
              )}

              <Link
                to="/cart"
                className="relative text-gray-600 hover:text-blue-600"
              >
                <FiShoppingBag className="text-xl" />
                {cartTotalCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartTotalCount}
                  </span>
                )}
              </Link>
              {isAuthenticated && (
                <Link
                  to="/chat"
                  className="relative text-gray-600 hover:text-blue-600"
                >
                  <FiMessageSquare className="text-xl" />
                  {chatNotifications > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chatNotifications}
                    </span>
                  )}
                </Link>
              )}

              {/* User Menu */}
              <div ref={ref} className="relative">
                <button
                  onClick={() => setShowUser(!showUser)}
                  className="text-gray-600 hover:text-blue-600"
                >
                  <FiUser className="text-xl" />
                </button>

                {showUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50"
                  >
                    {isAuthenticated ? (
                      <div className="py-2">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            Hello, {userName || user?.username}
                          </p>
                        </div>
                        <Link
                          to="/order-history"
                          onClick={() => setShowUser(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Order History
                        </Link>

                        <Link
                          to="/return-requests"
                          onClick={() => setShowUser(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Return Requests
                        </Link>
                        <Link
                          to="/my-reviews"
                          onClick={() => setShowUser(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          My Reviews
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setShowUser(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          My Profile
                        </Link>

                        <div className="border-t border-gray-100 mt-2">
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <Link
                          to="/signin"
                          onClick={() => setShowUser(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Sign in
                        </Link>
                        <Link
                          to="/signup"
                          onClick={() => setShowUser(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Register
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <div className="text-3xl font-bold text-[#e53e3e] tracking-tight">
              TUTHAITU
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-4xl mx-8">
            <div className="flex items-center border-2 border-gray-300 rounded overflow-hidden hover:border-blue-500 focus-within:border-blue-500">
              {/* Category Dropdown */}
              <div ref={categoryRef} className="relative">
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="flex items-center px-4 py-3 bg-gray-50 border-r border-gray-300 text-gray-700 hover:bg-gray-100 min-w-max"
                >
                  <span className="text-sm font-medium truncate max-w-32">
                    {selectedCategory}
                  </span>
                  <MdKeyboardArrowDown className="ml-2 text-gray-500" />
                </button>

                {showCategories && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 bg-white border border-gray-300 shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {categories.map((cat, index) => (
                      <button
                        key={index}
                        onClick={() => handleCategorySelect(cat)}
                        className={`w-full text-left px-4 py-2 hover:bg-blue-50 text-sm ${
                          selectedCategory === cat
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search for anything"
                  className="w-full px-4 py-3 outline-none text-gray-700 placeholder-gray-500"
                />

                {/* Search Results Dropdown */}
                {searchQuery && filteredProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-full left-0 right-0 bg-white border border-gray-300 shadow-xl max-h-96 overflow-y-auto z-50"
                  >
                    {filteredProducts.slice(0, 8).map((item) => (
                      <div
                        key={item._id}
                        onClick={() => {
                          navigate(`/product/${item._id}`, { state: { item } });
                          setSearchQuery("");
                        }}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          <img
                            className="w-full h-full object-contain"
                            src={getProductImage(item)}
                            alt={item.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://via.placeholder.com/48?text=No+Image";
                            }}
                          />
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-sm text-blue-600 font-semibold">
                            ${item.price?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Search Button */}
              <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Chat */}

            {/* Mobile Menu */}
            <button
              onClick={() => setSidenav(!sidenav)}
              className="lg:hidden text-gray-600 hover:text-blue-600"
            >
              <HiMenuAlt2 className="text-2xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
