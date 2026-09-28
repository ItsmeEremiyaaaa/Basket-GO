# Basket GO

Basket GO is an e-commerce platform for a grocery store in Bansalan, Davao del Sur. Customers can browse products, place orders, and track their deliveries online, while store staff and riders manage everything from their own dashboards.

## Features

**Customers**
- Sign up, log in, and edit their profile
- Browse grocery products and check out
- Choose a delivery address within Bansalan and see it on a map
- View current orders and past transactions

**Admin**
- Manage products, orders, customers, and riders

**Riders**
- View and handle assigned deliveries

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: PHP
- Database: MySQL

## Getting Started

1. Clone the repository
```bash
   git clone https://github.com/ItsmeEremiyaaaa/Basket-GO.git
   cd Basket-GO
```
2. Install dependencies
```bash
   npm install
```
3. Create a database and import `server/migration.sql`, then `server/migration_riders.sql`.
4. Set your database credentials in `server/db.php`.
5. Point the frontend to your backend in `src/apiConfig.ts`.
6. Start the dev server
```bash
   npm run dev
```

## Project Structure

```
public/assets/   Product images and site assets
server/          PHP API, admin endpoints, and SQL migrations
src/             React + TypeScript frontend
```

## Developers

- Jeremiah Escubido
- Nicole Valdez
