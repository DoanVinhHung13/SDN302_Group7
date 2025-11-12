import React, { useState, useEffect, useCallback } from 'react';
import { BsSuitHeartFill } from "react-icons/bs";
import { GiReturnArrow } from "react-icons/gi";
import { FaShoppingCart } from "react-icons/fa";
import { MdOutlineLabelImportant } from "react-icons/md";
import Image from "../../designLayouts/Image";
import Badge from "./Badge";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart, addToWishlist } from "../../../redux/orebiSlice";
import ProductService from '../../../services/api/ProductService';
import WatchlistService from '../../../services/api/WatchlistService'; 

const Product = (props) => {
  const dispatch = useDispatch();
  const _id = props._id;
  const idString = (_id) => {
    return String(_id).toLowerCase().split(" ").join("");
  };
  const rootId = idString(_id);
  const navigate = useNavigate();
  const productItem = props;

  // KHAI BÁO STATE WATCHLIST 
  const [isWatching, setIsWatching] = useState(false); 

  // --- HÀM KIỂM TRA TRẠNG THÁI WATCHLIST BAN ĐẦU ---
  const checkWatchlistStatus = useCallback(async () => {
    try {
      // Gọi API để lấy danh sách Watchlist của User
      const response = await WatchlistService.getWatchlist();
      
      // Kiểm tra xem sản phẩm hiện tại có trong danh sách không
      // Sử dụng item._id để đảm bảo so sánh đúng ID sản phẩm
      const watching = response.watchlist.some(item => item._id === props._id);
      setIsWatching(watching);
    } catch (error) {
      // Xử lý lỗi (ví dụ: chưa đăng nhập, lỗi server)
      console.error("Failed to check watchlist status:", error);
      setIsWatching(false);
    }
  }, [props._id]);

  // --- EFFECT KIỂM TRA KHI COMPONENT LOAD ---
  useEffect(() => {
    // Chạy hàm kiểm tra trạng thái ban đầu
    checkWatchlistStatus(); 
  }, [props._id, checkWatchlistStatus]);


  const handleAddToCart = () => {
    dispatch(
      addToCart({
        _id: props._id,
        name: props.name,
        quantity: 1,
        images: props.images,
        isDeleted: props.isDeleted,
        price: props.price,
        color: props.inStock?.[0]?.color,
        cost: props.cost,
        inStock: props.inStock,
      })
    )
  };

  // --- HÀM XỬ LÝ WATCHLIST (GỌI API VÀ ĐỒNG BỘ TRẠNG THÁI) ---
  const handleWishList = async () => { 
  console.log("WATCHLIST: Button clicked for product ID:", props._id);
    try {
        const response = await WatchlistService.toggleWatchlist(props._id);
        
        // 1. Cập nhật trạng thái state local
        setIsWatching(response.isWatching);
        
        // 2. BẮT BUỘC: GỌI LẠI HÀM CHECK TRẠNG THÁI SAU KHI THAY ĐỔI 
        checkWatchlistStatus(); 
        
        console.log(response.message); 

    } catch (error) {
        console.error("Failed to toggle watchlist:", error);
    }
  };

  const handleProductDetails = () => {
    navigate(`/product/${rootId}`, {
      state: {
        item: productItem,
      },
    });
  };

  return (
    <div className="w-full relative group">
      <div className="max-w-80 max-h-80 relative overflow-y-hidden ">
        <div onClick={handleProductDetails}>
          <Image className="w-full h-full" imgSrc={props.images && props.images.length > 0 ? ProductService.getImage(props.images[0].filename) : ''} />
        </div>
        <div className="absolute top-6 left-8">
          {!props.isDeleted && <Badge text="New" />}
        </div>
        <div className="w-full h-32 absolute bg-white -bottom-[130px] group-hover:bottom-0 duration-700">
          <ul className="w-full h-full flex flex-col items-end justify-center gap-2 font-titleFont px-2 border-l border-r">
            <li className="text-[#767676] hover:text-primeColor text-sm font-normal border-b-[1px] border-b-gray-200 hover:border-b-primeColor flex items-center justify-end gap-2 hover:cursor-pointer pb-1 duration-300 w-full">
              Compare
              <span>
                <GiReturnArrow />
              </span>
            </li>
            <li
               onClick={handleAddToCart}
              className="text-[#767676] hover:text-primeColor text-sm font-normal border-b-[1px] border-b-gray-200 hover:border-b-primeColor flex items-center justify-end gap-2 hover:cursor-pointer pb-1 duration-300 w-full"
            >
             Add to cart
              <span>
                <FaShoppingCart />
              </span>
            </li>
            <li
              onClick={handleProductDetails}
              className="text-[#767676] hover:text-primeColor text-sm font-normal border-b-[1px] border-b-gray-200 hover:border-b-primeColor flex items-center justify-end gap-2 hover:cursor-pointer pb-1 duration-300 w-full"
            >
              View Details
              <span className="text-lg">
                <MdOutlineLabelImportant />
              </span>
            </li>
            <li
              onClick={handleWishList}
              className={`hover:text-primeColor text-sm font-normal border-b-[1px] border-b-gray-200 hover:border-b-primeColor flex items-center justify-end gap-2 hover:cursor-pointer pb-1 duration-300 w-full
                    ${isWatching ? 'text-red-500' : 'text-[#767676]'}`} 
            >
              {isWatching ? 'Remove from Wish List' : 'Add to Wish List'}
              <span>
                <BsSuitHeartFill />
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-80 py-6 flex flex-col gap-1 border-[1px] border-t-0 px-4">
        <div className="flex items-center justify-between font-titleFont">
          <h2 className="text-lg text-primeColor font-bold">
            {props.name}
          </h2>
          <p className="text-[#767676] text-[14px]">${props.price}</p>
        </div>
        <div>
          <p className="text-[#767676] text-[14px]">{props.color}</p>
          <div className="text-[#767676] text-[14px]">
            {props.inStock?.map((item) => (
              <p key={item._id}>Color: {item.color}, Quantity: {item.quantity}</p>
            ))}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Product;