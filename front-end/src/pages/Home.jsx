import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FilterListIcon from "@mui/icons-material/FilterList";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SortIcon from "@mui/icons-material/Sort";
import VerifiedIcon from "@mui/icons-material/Verified";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  Paper,
  Pagination,
  Rating,
  Skeleton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import axios from "axios";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import WatchlistService from "../services/api/WatchlistService";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [favoriteProducts, setFavoriteProducts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get authentication info from Redux store
  const authState = useSelector((state) => state.auth);
  const isAuthenticated = authState?.isAuthenticated || false;
  const user = authState?.user || null;
  const token = authState?.token || null;

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:9999";

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentStatus = query.get("paymentStatus");

    if (paymentStatus === "paid") {
      toast.success("Payment successful!");
      navigate("/", { replace: true });
    } else if (paymentStatus === "failed") {
      toast.error("Payment failed!");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Get category list
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await axios.get(`${API_BASE_URL}/api/categories`);
      setCategories(response.data.data || []);
    } catch (error) {
      toast.error("Error loading categories");
      console.error(error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Get products, can filter by category
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get("search");

      let url = `${API_BASE_URL}/api/products?page=${currentPage}&limit=9`;

      // Add search parameter if exists
      if (searchParam) {
        url += `&search=${encodeURIComponent(searchParam)}`;
      }

      if (selectedCategories.length > 0) {
        const categoryIds = selectedCategories.join(",");
        url += `&categories=${categoryIds}`;
      }

      if (minPrice) url += `&minPrice=${minPrice}`;
      if (maxPrice) url += `&maxPrice=${maxPrice}`;

      // Gửi sort order lên server (convert dashes to underscores)
      if (sortOrder !== "default") {
        const serverSort = sortOrder.replace(/-/g, '_');
        url += `&sort=${serverSort}`;
      }

      const response = await axios.get(url);
      const { data, pagination } = response.data;
      setTotalPages(pagination?.totalPages || 1);

      const formattedProducts = data.map((product) => {
        let imageUrl;

        const img = String(product.image || "").trim();

        if (img.startsWith("http://") || img.startsWith("https://")) {
          imageUrl = img;
        } else if (img) {
          imageUrl = `${API_BASE_URL}/uploads/${img}`;
        } else {
          imageUrl = "https://via.placeholder.com/300?text=No+Image";
        }

        return {
          ...product,
          imageUrl,
          categoryName: product.categoryId?.name || "Uncategorized",
          sellerName: product.sellerId?.username || "Unknown Seller",
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
        };
      });

      setProducts(formattedProducts);
    } catch (error) {
      toast.error("Error loading products");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Read URL query params whenever location changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoriesParam = params.get("categories");

    if (categoriesParam) {
      const categoryIds = categoriesParam.split(",").filter(id => id);
      setSelectedCategories(categoryIds);
    } else {
      setSelectedCategories([]);
    }

    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when category, page, price, sortOrder changes
  useEffect(() => {
    fetchProducts();
  }, [selectedCategories, currentPage, minPrice, maxPrice, sortOrder]);

  // Reset page to 1 when filters change (nhưng không khi currentPage thay đổi)
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, minPrice, maxPrice]);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "https://via.placeholder.com/300?text=No+Image";
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleAddToCart = async (productId) => {
    if (!isAuthenticated) {
      toast.info("Please sign in to add products to cart");
      navigate("/signin");
      return;
    }

    const productToAdd = products.find((p) => p._id === productId);

    if (
      user?.role === "seller" &&
      productToAdd &&
      productToAdd.sellerId?._id === user?.id
    ) {
      toast.warning("You cannot add your own products to cart");
      return;
    }

    try {
      setAddingToCart((prev) => ({ ...prev, [productId]: true }));

      const response = await axios.post(
        `${API_BASE_URL}/api/buyers/cart/add`,
        { productId, quantity: 1 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Product added to cart!");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(error.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleToggleFavorite = async (productId) => { // 🌟 THÊM ASYNC 🌟
    if (!isAuthenticated) {
        toast.info("Please sign in to favorite products");
        navigate("/signin");
        return;
    }

    try {
        // Cập nhật trạng thái loading tạm thời (Tùy chọn)
        setFavoriteProducts((prev) => ({
            ...prev,
            [productId]: !prev[productId], // Tạm thời đảo ngược trạng thái FE
        }));
        
        // 1. GỌI API ĐỂ THÊM/XÓA SẢN PHẨM KHỎI WATCHLIST
        const response = await WatchlistService.toggleWatchlist(productId);

        // 2. CẬP NHẬT GIAO DIỆN (hiển thị thông báo)
        if (response.isWatching) {
            toast.success("Added to favorites!");
        } else {
            toast.info("Removed from favorites");
        }

        // 3. ĐỒNG BỘ VĨNH VIỄN: Gọi lại fetchProducts() để tải lại dữ liệu
        // Điều này là cần thiết vì API Watchlist thay đổi dữ liệu User,
        // nhưng API Product cần thông tin đó để biết sản phẩm có được yêu thích hay không.
        // LƯU Ý: Nếu fetchProducts() quá chậm, bạn có thể chỉ cần gọi lại API
        //  để lấy watchlist và cập nhật state favoriteProducts
        
        // Nếu API product/user của bạn không trả về trạng thái watchlist cùng với product,
        // bạn cần chạy lại hàm lấy sản phẩm để cập nhật trạng thái trái tim chính xác.
        // fetchProducts(); 
        
        // CÁCH TỐT HƠN (Không tải lại sản phẩm):
        // Nếu bạn đã có trạng thái favoriteProducts[productId] ban đầu, 
        // bạn chỉ cần cập nhật trạng thái local một lần nữa
        
        // (Giữ nguyên logic setFavoriteProducts ban đầu vì nó đã chạy trước đó)

    } catch (error) {
        // Nếu lỗi, cuộn lại trạng thái local và báo lỗi
        setFavoriteProducts((prev) => ({
            ...prev,
            [productId]: !prev[productId], // Hoàn tác lại trạng thái FE
        }));
        console.error("Error toggling favorite:", error);
        toast.error("Failed to update favorites.");
    }
};

  const handleProductClick = (product) => {
    navigate(`/auth/product/${product._id}`, { state: { item: product } });
  };

  const handleSortChange = (order) => {
    setSortOrder(order);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  // Fetch products khi sort order thay đổi
  useEffect(() => {
    setCurrentPage(1); // Reset về trang 1 khi sort
  }, [sortOrder]);

  const getSortedProducts = () => {
    // Sort đã được xử lý trên server, không cần sort lại client-side
    return [...products];
  };

  const ProductSkeleton = () => (
    <>
      {Array.from(new Array(8)).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: 3,
            }}
          >
            <Skeleton variant="rectangular" height={220} animation="wave" />
            <CardContent>
              <Skeleton
                variant="text"
                height={32}
                width="80%"
                animation="wave"
              />
              <Skeleton
                variant="text"
                height={20}
                width="40%"
                animation="wave"
              />
              <Box display="flex" alignItems="center" my={1}>
                <Skeleton
                  variant="text"
                  height={24}
                  width="60%"
                  animation="wave"
                />
              </Box>
              <Skeleton
                variant="text"
                height={20}
                width="100%"
                animation="wave"
              />
              <Skeleton
                variant="text"
                height={20}
                width="100%"
                animation="wave"
              />
              <Skeleton
                variant="text"
                height={36}
                width="50%"
                animation="wave"
                sx={{ mt: 2 }}
              />
              <Skeleton
                variant="rectangular"
                height={36}
                width="100%"
                animation="wave"
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </>
  );

  if (loading || loadingCategories) {
    return (
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography
            variant="h4"
            gutterBottom
            sx={{ fontWeight: 700, color: "#0F52BA" }}
          >
            Discover Products
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <FilterListIcon sx={{ mr: 1, color: "#0F52BA" }} />
                <Skeleton variant="text" width={100} animation="wave" />
              </Box>

              {Array.from(new Array(5)).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="text"
                  height={30}
                  animation="wave"
                  sx={{ my: 1 }}
                />
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12} md={9}>
            <Grid container spacing={3}>
              <ProductSkeleton />
            </Grid>
          </Grid>
        </Grid>
      </Container>
    );
  }

  const sortedProducts = getSortedProducts();

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 5,
            borderBottom: "2px solid #e0e0e0",
            pb: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #0F52BA, #5E91F5)",
              backgroundClip: "text",
              textFillColor: "transparent",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              position: "relative",
              "&:after": {
                content: '""',
                position: "absolute",
                bottom: -12,
                left: 0,
                width: "80px",
                height: "5px",
                background: "linear-gradient(45deg, #0F52BA, #5E91F5)",
                borderRadius: "10px",
              },
            }}
          >
            Discover Products
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={4}>
        <Grid item xs={12} md={3}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 3,
                mb: 4,
                borderRadius: 3,
                background: "linear-gradient(145deg, #ffffff, #f5f7ff)",
                border: "1px solid #eaeaea",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <FilterListIcon
                  sx={{ mr: 1.5, color: "#0F52BA", fontSize: 24 }}
                />
                <Typography variant="h6" fontWeight="700" color="#333">
                  Filters
                </Typography>
              </Box>

              <Divider sx={{ mb: 3, borderColor: "rgba(0,0,0,0.08)" }} />

              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: "bold",
                  color: "#444",
                  fontSize: "1.05rem",
                }}
              >
                Categories
              </Typography>

              <FormGroup>
                {categories.map((category) => (
                  <FormControlLabel
                    key={category._id}
                    control={
                      <Checkbox
                        checked={selectedCategories.includes(category._id)}
                        onChange={() => handleCategoryChange(category._id)}
                        size="small"
                        sx={{
                          color: "#0F52BA",
                          "&.Mui-checked": {
                            color: "#0F52BA",
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: selectedCategories.includes(category._id)
                            ? 600
                            : 400,
                        }}
                      >
                        {category.name}
                      </Typography>
                    }
                    sx={{ mb: 0.8 }}
                  />
                ))}
              </FormGroup>

              <Button
                variant="outlined"
                fullWidth
                sx={{
                  mt: 3,
                  color: "#0F52BA",
                  borderColor: "#0F52BA",
                  borderRadius: 2,
                  py: 1,
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "rgba(15, 82, 186, 0.08)",
                    borderColor: "#0F52BA",
                  },
                }}
                onClick={() => setSelectedCategories([])}
              >
                Clear Filters
              </Button>
            </Paper>

            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 3,
                background: "linear-gradient(145deg, #ffffff, #f5f7ff)",
                border: "1px solid #eaeaea",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <SortIcon sx={{ mr: 1.5, color: "#0F52BA", fontSize: 24 }} />
                <Typography variant="h6" fontWeight="700" color="#333">
                  Sort By
                </Typography>
              </Box>

              <Divider sx={{ mb: 3, borderColor: "rgba(0,0,0,0.08)" }} />

              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sortOrder === "default"}
                      onChange={() => handleSortChange("default")}
                      size="small"
                      sx={{
                        color: "#0F52BA",
                        "&.Mui-checked": {
                          color: "#0F52BA",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: sortOrder === "default" ? 600 : 400 }}
                    >
                      Default
                    </Typography>
                  }
                  sx={{ mb: 0.8 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sortOrder === "price-asc"}
                      onChange={() => handleSortChange("price-asc")}
                      size="small"
                      sx={{
                        color: "#0F52BA",
                        "&.Mui-checked": {
                          color: "#0F52BA",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: sortOrder === "price-asc" ? 600 : 400 }}
                    >
                      Price: Low to High
                    </Typography>
                  }
                  sx={{ mb: 0.8 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sortOrder === "price-desc"}
                      onChange={() => handleSortChange("price-desc")}
                      size="small"
                      sx={{
                        color: "#0F52BA",
                        "&.Mui-checked": {
                          color: "#0F52BA",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: sortOrder === "price-desc" ? 600 : 400,
                      }}
                    >
                      Price: High to Low
                    </Typography>
                  }
                  sx={{ mb: 0.8 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sortOrder === "name-asc"}
                      onChange={() => handleSortChange("name-asc")}
                      size="small"
                      sx={{
                        color: "#0F52BA",
                        "&.Mui-checked": {
                          color: "#0F52BA",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: sortOrder === "name-asc" ? 600 : 400 }}
                    >
                      Name: A to Z
                    </Typography>
                  }
                  sx={{ mb: 0.8 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sortOrder === "name-desc"}
                      onChange={() => handleSortChange("name-desc")}
                      size="small"
                      sx={{
                        color: "#0F52BA",
                        "&.Mui-checked": {
                          color: "#0F52BA",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: sortOrder === "name-desc" ? 600 : 400 }}
                    >
                      Name: Z to A
                    </Typography>
                  }
                  sx={{ mb: 0.8 }}
                />
              </FormGroup>
            </Paper>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={9}>
          {selectedCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", gap: 1 }}>
                {selectedCategories.map((catId) => {
                  const category = categories.find((c) => c._id === catId);
                  return category ? (
                    <Chip
                      key={catId}
                      label={category.name}
                      onDelete={() => handleCategoryChange(catId)}
                      color="primary"
                      sx={{
                        backgroundColor: "#0F52BA",
                        borderRadius: 6,
                        px: 0.5,
                        fontWeight: 500,
                        "& .MuiChip-deleteIcon": {
                          color: "white",
                          "&:hover": {
                            color: "#f0f0f0",
                          },
                        },
                      }}
                    />
                  ) : null;
                })}

                <Chip
                  label="Clear All"
                  onClick={() => setSelectedCategories([])}
                  variant="outlined"
                  sx={{
                    borderColor: "#0F52BA",
                    color: "#0F52BA",
                    borderRadius: 6,
                    fontWeight: 500,
                  }}
                />
              </Box>
            </motion.div>
          )}

          <Box
            sx={{
              mb: 3.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Showing{" "}
              <span style={{ fontWeight: 700, color: "#0F52BA" }}>
                {sortedProducts.length}
              </span>{" "}
              products
            </Typography>
          </Box>

          {sortedProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Paper
                elevation={2}
                sx={{
                  textAlign: "center",
                  p: 8,
                  borderRadius: 3,
                  backgroundColor: "#f9f9ff",
                  border: "1px dashed rgba(15, 82, 186, 0.3)",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ mb: 3, color: "#555", fontWeight: 600 }}
                >
                  No products match your criteria
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setSelectedCategories([])}
                  sx={{
                    backgroundColor: "#0F52BA",
                    borderRadius: 2,
                    px: 4,
                    py: 1.2,
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: "#0A3C8A",
                    },
                  }}
                >
                  View all products
                </Button>
              </Paper>
            </motion.div>
          ) : (
            <>
              <Grid container spacing={3}>
                {sortedProducts.map((product, index) => (
                  <Grid item xs={12} sm={6} md={4} key={product._id}>
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.08,
                        ease: [0.25, 0.1, 0.25, 1.0],
                      }}
                    >
                      <Card
                        sx={{
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          transition:
                            "all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)",
                          borderRadius: 4,
                          overflow: "hidden",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                          position: "relative",
                          "&:hover": {
                            transform: "translateY(-12px)",
                            boxShadow: "0 16px 30px rgba(15, 82, 186, 0.15)",
                          },
                        }}
                      >
                        {product.rating >= 4.5 && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 12,
                              left: 12,
                              zIndex: 2,
                              backgroundColor: "#0F52BA",
                              color: "white",
                              borderRadius: 6,
                              px: 1.5,
                              py: 0.5,
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              boxShadow: "0 4px 8px rgba(15, 82, 186, 0.3)",
                            }}
                          >
                            <VerifiedIcon fontSize="small" />
                            Top Rated
                          </Box>
                        )}

                        <Box
                          sx={{
                            position: "relative",
                            height: "240px",
                            overflow: "hidden",
                            backgroundColor: "#f7f9ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 2,
                          }}
                        >
                          <CardMedia
                            component="img"
                            sx={{
                              height: "180px",
                              width: "100%",
                              objectFit: "contain",
                              transition:
                                "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1.0)",
                              "&:hover": {
                                transform: "scale(1.08)",
                              },
                            }}
                            image={
                              product.imageUrl ||
                              "https://via.placeholder.com/300?text=No+Image"
                            }
                            alt={product.title || "Product Image"}
                            onError={handleImageError}
                            onClick={() => handleProductClick(product)}
                          />

                          <Box
                            sx={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                sx={{
                                  backgroundColor: "white",
                                  boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
                                  transition: "all 0.3s ease",
                                  "&:hover": {
                                    backgroundColor: "#0F52BA",
                                    color: "white",
                                    transform: "scale(1.1)",
                                  },
                                }}
                                onClick={() => handleProductClick(product)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip
                              title={
                                favoriteProducts[product._id]
                                  ? "Remove from Favorites"
                                  : "Add to Favorites"
                              }
                            >
                              <IconButton
                                size="small"
                                sx={{
                                  backgroundColor: "white",
                                  boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
                                  transition: "all 0.3s ease",
                                  color: favoriteProducts[product._id]
                                    ? "#ff3d71"
                                    : "inherit",
                                  "&:hover": {
                                    backgroundColor: favoriteProducts[
                                      product._id
                                    ]
                                      ? "#fff0f3"
                                      : "#fff5f7",
                                    color: "#ff3d71",
                                    transform: "scale(1.1)",
                                  },
                                }}
                                onClick={() =>
                                  handleToggleFavorite(product._id)
                                }
                              >
                                {favoriteProducts[product._id] ? (
                                  <FavoriteIcon fontSize="small" />
                                ) : (
                                  <FavoriteBorderIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        <CardContent sx={{ flexGrow: 1, p: 3, pt: 2.5, pb: 1.5 }}>
                          <Box sx={{ mb: 1 }}>
                            <Chip
                              label={product.categoryName}
                              size="small"
                              sx={{
                                backgroundColor: "rgba(15, 82, 186, 0.08)",
                                color: "#0F52BA",
                                fontWeight: 600,
                                fontSize: "0.7rem",
                                borderRadius: 6,
                                height: 22,
                              }}
                            />
                            {product.inventory &&
                              product.inventory.quantity < 5 &&
                              product.inventory.quantity > 0 && (
                                <Chip
                                  label="Low Stock"
                                  size="small"
                                  sx={{
                                    backgroundColor: "#fff0e1",
                                    color: "#ff9500",
                                    fontWeight: 600,
                                    fontSize: "0.7rem",
                                    ml: 1,
                                    borderRadius: 6,
                                    height: 22,
                                  }}
                                />
                              )}
                          </Box>

                          <Typography
                            gutterBottom
                            variant="h6"
                            component="div"
                            fontWeight="700"
                            sx={{
                              fontSize: "1.1rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              height: "2.75em",
                              cursor: "pointer",
                              color: "#262a41",
                            }}
                            onClick={() => handleProductClick(product)}
                          >
                            {product.title || "Untitled Product"}
                          </Typography>

                          <Box display="flex" alignItems="center" mb={1.5}>
                            <Rating
                              value={product.rating || 0}
                              readOnly
                              size="small"
                              precision={0.5}
                              sx={{
                                "& .MuiRating-iconFilled": {
                                  color: "#0F52BA",
                                },
                              }}
                            />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 1, fontSize: "0.85rem" }}
                            >
                              <span style={{ fontWeight: 600 }}>
                                {product.rating
                                  ? product.rating.toFixed(1)
                                  : "0.0"}
                              </span>
                              {product.reviewCount > 0 && (
                                <span> ({product.reviewCount})</span>
                              )}
                            </Typography>
                          </Box>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              height: "3em",
                              color: "#6b7280",
                              lineHeight: 1.6,
                            }}
                          >
                            {product.description || "No description available"}
                          </Typography>

                          {product.freeShipping && (
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 1,
                                gap: 0.7,
                              }}
                            >
                              <LocalShippingIcon
                                sx={{ fontSize: "1rem", color: "#36b37e" }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#36b37e",
                                  fontWeight: 500,
                                  fontSize: "0.85rem",
                                }}
                              >
                                Free Shipping
                              </Typography>
                            </Box>
                          )}

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 1.5,
                              mt: 2,
                            }}
                          >
                            <Typography
                              variant="h6"
                              fontWeight="800"
                              sx={{
                                color: "#0F52BA",
                                fontSize: "1.3rem",
                              }}
                            >
                              ${product.price?.toFixed(2)}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontStyle: "italic", fontSize: "0.85rem" }}
                            >
                              By {product.sellerName}
                            </Typography>
                          </Box>
                        </CardContent>

                        <CardActions sx={{ p: 0 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<AddShoppingCartIcon />}
                            onClick={() => handleAddToCart(product._id)}
                            disabled={addingToCart[product._id]}
                            sx={{
                              backgroundColor: "#0F52BA",
                              borderRadius: 0,
                              py: 1.5,
                              fontWeight: 600,
                              letterSpacing: "0.5px",
                              transition: "all 0.3s ease",
                              "&:hover": {
                                backgroundColor: "#0A3C8A",
                                boxShadow: "0 4px 12px rgba(15, 82, 186, 0.3)",
                              },
                              textTransform: "none",
                              fontSize: "0.95rem",
                            }}
                          >
                            {addingToCart[product._id]
                              ? "Adding..."
                              : "Add to Cart"}
                          </Button>
                        </CardActions>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>

              {/* PAGINATION */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 6,
                  mb: 2,
                }}
              >
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: "#0F52BA",
                      borderColor: "#0F52BA",
                    },
                    "& .MuiPaginationItem-page.Mui-selected": {
                      backgroundColor: "#0F52BA",
                      color: "white",
                    },
                    "& .MuiPaginationItem-page:hover": {
                      backgroundColor: "rgba(15, 82, 186, 0.08)",
                    },
                  }}
                />
              </Box>
            </>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Home;