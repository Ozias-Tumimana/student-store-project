## Unit Assignment: Student Store

Submitted by: **Ozias Tumimana**

### Application Features

#### CORE FEATURES

- [x] **Database Creation**: Set up a Postgres database to store information about products and orders.
  - [x]  Use Prisma to define models for `products`, `orders`, and `order_items`.
  - [X]  **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of your `products`, `orders`, and `order_items` tables. 
- [x] **Products Model**
  - [x] Develop a products model to represent individual items available in the store. 
  - [x] This model should at minimum include the attributes:
    - [x] `id`
    - [x] `name`
    - [x] `description`
    - [x] `price` 
    - [x] `image_url` _(implemented as `imageUrl` — Prisma camelCase convention)_
    - [x] `category`
  - [x] Implement methods for CRUD operations on products.
  - [x] Ensure transaction handling such that when an product is deleted, any `order_items` that reference that product are also deleted. 
  - [X] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of all attributes (table columns) in your Products Model.
- [x] **Orders Model**
  - [x] Develop a model to manage orders. 
  - [x] This model should at minimum include the attributes:
    - [x] `order_id` _(implemented as `id`)_
    - [x] `customer_id` _(implemented as `customer`, a String storing the checkout email)_
    - [x] `total_price` _(implemented as `totalPrice`)_
    - [x] `status`
    - [x] `created_at` _(implemented as `createdAt`)_
  - [x] Implement methods for CRUD operations on orders.
  - [x] Ensure transaction handling such that when an order is deleted, any `order_items` that reference that order are also deleted. 
  - [X] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of all attributes (table columns) in your Order Model.

- [x] **Order Items Model**
  - [x] Develop a model to represent the items within an order. 
  - [x] This model should at minimum include the attributes:
    - [x] `order_item_id` _(implemented as `id`)_
    - [x] `order_id` _(implemented as `orderId`)_
    - [x] `product_id` _(implemented as `productId`)_
    - [x] `quantity`
    - [x] `price`
  - [x] Implement methods for fetching and creating order items.  
  - [X] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Prisma Studio to demonstrate the creation of all attributes (table columns) in your Order Items Model.
- [x] **API Endpoints**
  - [x] Application supports the following **Product Endpoints**:
    - [x] `GET /products`: Fetch a list of all products.
    - [x] `GET /products/:id`: Fetch details of a specific product by its ID.
    - [x] `POST /products`: Add a new product to the database.
    - [x] `PUT /products/:id`: Update the details of an existing product.
    - [x] `DELETE /products/:id`: Remove a product from the database.
  - [x] Application supports the following **Order Endpoints**:
    - [x] `GET /orders`: Fetch a list of all orders.
    - [x] `GET /orders/:order_id`: Fetch details of a specific order by its ID, including the order items.
    - [x] `POST /orders`: Create a new order with specified order items.
    - [x] `PUT /orders/:order_id`: Update the details of an existing order (e.g., change status).
    - [x] `DELETE /orders/:order_id`: Remove an order from the database.
    - [X] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use Postman or another API testing tool to demonstrate the successful implementation of each endpoint. For the `DELETE` endpoints, please use Prisma Studio to demonstrate that any relevant order items have been deleted. 
- [x] **Frontend Integration**
  - [x] Connect the backend API to the provided frontend interface, ensuring dynamic interaction for product browsing, cart management, and order placement. Adjust the frontend as necessary to work with your API.
  - [x] Ensure the home page displays products contained in the product table.
  - [X] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: Use `npm start` to run your server and display your website in your browser. 
    - [x] Demonstrate that users can successfully add items to their shopping cart, delete items from their shopping cart, and place an order
    - [x] After placing an order use Postman or Prisma Studio demonstrate that a corresponding order has been created in your orders table.

### Stretch Features

- [x] **Added Endpoints**
  - [x] `GET /order-items`: Create an endpoint for fetching all order items in the database.
  - [x] `POST /orders/:order_id/items` Create an endpoint that adds a new order item to an existing order. 
- [ ] **Past Orders Page**
  - [ ] Build a page in the UI that displays the list of all past orders.
  - [ ] The page lists all past orders for the user, including relevant information such as:
    - [ ] Order ID
    - [ ] Date
    - [ ] Total cost
    - [ ] Order status.
  - [ ] The user should be able to click on any individual order to take them to a separate page detailing the transaction.
  - [ ] The individual transaction page provides comprehensive information about the transaction, including:
    - [ ] List of order items
    - [ ] Order item quantities
    - [ ] Individual order item costs
    - [ ] Total order cost
- [ ] **Filter Orders**.
  - [ ] Create an input on the Past Orders page of the frontend application that allows the user to filter orders by the email of the person who placed the order. 
  - [ ] Users can type in an email and click a button to filter the orders.
  - [ ] Upon entering an email address and submitting the input, the list of orders is filtered to only show orders placed by the user with the provided email. 
  - [ ] The user can easily navigate back to the full list of orders after filtering. 
    - [ ] Proper error handling is implemented, such as displaying "no orders found" when an invalid email is provided.
- [ ] **Deployment**
  - [ ] Website is deployed using [Render](https://courses.codepath.org/snippets/site/render_deployment_guide).
  - [ ] **VIDEO WALKTHROUGH SPECIAL INSTRUCTIONS**: To ease the grading process, please use the deployed version of your website in your walkthrough with the URL visible. 



### Walkthrough Video

`https://www.loom.com/share/e058784ed8a748799c315c05fa67cc33`

### Reflection

* Did the topics discussed in your labs prepare you to complete the assignment? Be specific, which features in your weekly assignment did you feel unprepared to complete?

For the most part yes. The labs covered the basics of Prisma models and CRUD routes pretty well, so the products and orders endpoints felt familiar by the time I got to them. The part I felt least prepared for was the POST /orders transaction. Creating the order, creating all the order items, and calculating the total all at once (and rolling it back if one product ID is bad) was a new concept for me. I had to spend extra time reading the Prisma docs on $transaction to actually understand what was happening instead of just copying it.

* If you had more time, what would you have done differently? Would you have added additional features? Changed the way your project responded to a particular event, etc.

I'd build out the Past Orders page on the frontend. I already added the ?customer= filter on the backend GET /orders route with the stretch in mind, so the API side is basically ready, I just ran out of time to build the UI page and the email filter on top of it. I'd also like to deploy it on Render so there's a live link instead of only running it locally.

* Reflect on your project demo, what went well? Were there things that maybe didn't go as planned? Did you notice something that your peer did that you would like to try next time?

The cascade delete demo in Prisma Studio went really well, it's satisfying to delete a product and watch the order items disappear on their own. The thing that didn't go as planned was a frustrating little bug where one of my Postman requests kept returning a 404, and it turned out there was a trailing space in the URL that was getting encoded as %20. Took me way too long to spot. Next time I want to set up a saved Postman collection from the start instead of making the requests one at a time as I go.

### Open-source libraries used

Backend:
- [Express](https://expressjs.com/) - web server and routing
- [Prisma](https://www.prisma.io/) - ORM and migrations
- [pg](https://node-postgres.com/) - PostgreSQL driver
- [cors](https://github.com/expressjs/cors) - enabling cross-origin requests from the frontend
- [dotenv](https://github.com/motdotla/dotenv) - loading the database URL from .env

Frontend:
- [React](https://react.dev/) + [React Router](https://reactrouter.com/) - UI and routing
- [Axios](https://axios-http.com/) - making requests to the API
- [Moment](https://momentjs.com/) - formatting dates
- [Vite](https://vitejs.dev/) - dev server and build tool

### Shout out

Big thanks to Michael for helping me out when I was connecting the frontend to my backend. I was stuck getting the two to talk to each other and his help got me past it.