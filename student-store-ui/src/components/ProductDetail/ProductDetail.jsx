import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import NotFound from "../NotFound/NotFound";
import { formatPrice } from "../../utils/format";
import { API_BASE_URL } from "../../constants";
import "./ProductDetail.css";

function ProductDetail({ products = [], addToCart, removeFromCart, getQuantityOfItemInCart }) {

  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fromList = products.find((p) => String(p.id) === String(productId));
    if (fromList) {
      setProduct(fromList);
      return;
    }
    const fetchProduct = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/products/${productId}`);
        setProduct(data);
      } catch (err) {
        console.error(err);
        setError("Product not found");
      } finally {
        setIsFetching(false);
      }
    };
    fetchProduct();
  }, [productId, products]);

  if (error) {
    return <NotFound />;
  }

  if (isFetching || !product) {
    return <h1>Loading...</h1>;
  }

  const quantity = getQuantityOfItemInCart(product);

  const handleAddToCart = () => {
    if (product.id) {
      addToCart(product)
    }
  };

  const handleRemoveFromCart = () => {
    if (product.id) {
      removeFromCart(product);
    }
  };

  return (
    <div className="ProductDetail">
      <div className="product-card">
        <div className="media">
          <img src={product.imageUrl || "/placeholder.png"} alt={product.name} />
        </div>
        <div className="product-info">
          <p className="product-name">{product.name}</p>
          <p className="product-price">{formatPrice(product.price)}</p>
          <p className="description">{product.description}</p>
          <div className="actions">
            <button onClick={handleAddToCart}>Add to Cart</button>
            {quantity > 0 && <button onClick={handleRemoveFromCart}>Remove from Cart</button>}
            {quantity > 0 && <span className="quantity">Quantity: {quantity}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}


export default ProductDetail;