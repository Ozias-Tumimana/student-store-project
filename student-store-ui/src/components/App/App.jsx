import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import SubNavbar from "../SubNavbar/SubNavbar";
import Sidebar from "../Sidebar/Sidebar";
import Home from "../Home/Home";
import ProductDetail from "../ProductDetail/ProductDetail";
import NotFound from "../NotFound/NotFound";
import { removeFromCart, addToCart, getQuantityOfItemInCart, getTotalItemsInCart } from "../../utils/cart";
import { calculateOrderSubtotal, calculateTaxesAndFees, calculateTotal } from "../../utils/calculations";
import { formatPrice } from "../../utils/format";
import { API_BASE_URL } from "../../constants";
import "./App.css";

function App() {

  // State variables
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [isFetching, setIsFetching] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/products`);
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load products. Is the backend running?");
      } finally {
        setIsFetching(false);
      }
    };
    fetchProducts();
  }, []);

  // Toggles sidebar
  const toggleSidebar = () => setSidebarOpen((isOpen) => !isOpen);

  // Functions to change state (used for lifting state)
  const handleOnRemoveFromCart = (item) => setCart(removeFromCart(cart, item));
  const handleOnAddToCart = (item) => setCart(addToCart(cart, item));
  const handleGetItemQuantity = (item) => getQuantityOfItemInCart(cart, item);
  const handleGetTotalCartItems = () => getTotalItemsInCart(cart);

  const handleOnSearchInputChange = (event) => {
    setSearchInputValue(event.target.value);
  };

  const handleOnCheckout = async () => {
    const items = Object.keys(cart).map((productId) => ({
      productId: Number(productId),
      quantity: cart[productId],
    }));

    if (!items.length) {
      setError("Your cart is empty. Add an item before checking out.");
      return;
    }
    if (!userInfo.email) {
      setError("Please enter your email before checking out.");
      return;
    }

    setIsCheckingOut(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/orders`, {
        customer: userInfo.email,
        items,
      });

      const productById = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      const subtotal = calculateOrderSubtotal(
        data.orderItems.map((oi) => ({ price: oi.price, quantity: oi.quantity }))
      );
      const lines = [
        `Thanks for your order, ${userInfo.email}!`,
        ...data.orderItems.map(
          (oi) =>
            `${oi.quantity} x ${productById[oi.productId]?.name ?? `Product #${oi.productId}`} — ${formatPrice(
              oi.price * oi.quantity
            )}`
        ),
        `Subtotal: ${formatPrice(subtotal)}`,
        `Taxes & Fees: ${formatPrice(calculateTaxesAndFees(subtotal))}`,
        `Total: ${formatPrice(calculateTotal(subtotal))}`,
        `Order #${data.id} — status: ${data.status}`,
      ];

      setOrder({ ...data, purchase: { receipt: { lines } } });
      setCart({});
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.error || "Checkout failed. Please try again.";
      setError(message);
    } finally {
      setIsCheckingOut(false);
    }
  };


  return (
    <div className="App">
      <BrowserRouter>
        <Sidebar
          cart={cart}
          error={error}
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          isOpen={sidebarOpen}
          products={products}
          toggleSidebar={toggleSidebar}
          isCheckingOut={isCheckingOut}
          addToCart={handleOnAddToCart}
          removeFromCart={handleOnRemoveFromCart}
          getQuantityOfItemInCart={handleGetItemQuantity}
          getTotalItemsInCart={handleGetTotalCartItems}
          handleOnCheckout={handleOnCheckout}
          order={order}
          setOrder={setOrder}
        />
        <main>
          <SubNavbar
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            searchInputValue={searchInputValue}
            handleOnSearchInputChange={handleOnSearchInputChange}
          />
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  error={error}
                  products={products}
                  isFetching={isFetching}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  addToCart={handleOnAddToCart}
                  searchInputValue={searchInputValue}
                  removeFromCart={handleOnRemoveFromCart}
                  getQuantityOfItemInCart={handleGetItemQuantity}
                />
              }
            />
            <Route
              path="/:productId"
              element={
                <ProductDetail
                  cart={cart}
                  error={error}
                  products={products}
                  addToCart={handleOnAddToCart}
                  removeFromCart={handleOnRemoveFromCart}
                  getQuantityOfItemInCart={handleGetItemQuantity}
                />
              }
            />
            <Route
              path="*"
              element={
                <NotFound
                  error={error}
                  products={products}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                />
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;
 