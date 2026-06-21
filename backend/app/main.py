import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, engine, get_db

LOW_STOCK_THRESHOLD = int(os.getenv("LOW_STOCK_THRESHOLD", "5"))

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory & Order Management System")

origins = os.getenv("CORS_ORIGINS", "").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "inventory-order-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ============== PRODUCTS ==============
@app.post("/products", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Product).filter(models.Product.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    product = models.Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="SKU already exists")
    db.refresh(product)
    return product


@app.get("/products", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.id).all()


@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.put("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)

    if "sku" in data and data["sku"] != product.sku:
        dup = db.query(models.Product).filter(models.Product.sku == data["sku"]).first()
        if dup:
            raise HTTPException(status_code=400, detail="SKU already exists")

    for field, value in data.items():
        setattr(product, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="SKU already exists")
    db.refresh(product)
    return product


@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None


# ============== CUSTOMERS ==============
@app.post("/customers", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Customer).filter(models.Customer.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    customer = models.Customer(**payload.model_dump())
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    db.refresh(customer)
    return customer


@app.get("/customers", response_model=list[schemas.CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).order_by(models.Customer.id).all()


@app.get("/customers/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@app.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return None


# ============== ORDERS ==============
@app.post("/orders", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Lock-free check-then-act; fine for assessment scope (single instance, low concurrency)
    products_by_id = {}
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product '{product.name}' "
                       f"(available: {product.quantity}, requested: {item.quantity})",
            )
        products_by_id[item.product_id] = product

    total_amount = 0.0
    order = models.Order(customer_id=customer.id, total_amount=0.0)
    db.add(order)
    db.flush()  # get order.id

    for item in payload.items:
        product = products_by_id[item.product_id]
        line_total = product.price * item.quantity
        total_amount += line_total
        product.quantity -= item.quantity
        order_item = models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price,
        )
        db.add(order_item)

    order.total_amount = total_amount
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()


@app.get("/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Cancel an order and restock its items."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.quantity += item.quantity

    db.delete(order)
    db.commit()
    return None


# ============== DASHBOARD ==============
@app.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    total_products = db.query(func.count(models.Product.id)).scalar()
    total_customers = db.query(func.count(models.Customer.id)).scalar()
    total_orders = db.query(func.count(models.Order.id)).scalar()
    low_stock = (
        db.query(models.Product)
        .filter(models.Product.quantity <= LOW_STOCK_THRESHOLD)
        .order_by(models.Product.quantity)
        .all()
    )
    return schemas.DashboardSummary(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_products=low_stock,
    )
