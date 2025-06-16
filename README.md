# Vending Machine Inventory Management System

A full-stack web application for managing vending machine inventory across multiple locations with support for iOS Vending Systems and Cantaloupe Systems CSV formats. The system processes CSV files with sales transaction data and automatically calculates inventory levels.

## 🚀 Features

- **Authentication**: Supabase Auth with email/password login and signup
- **Dashboard**: Overview of all locations with inventory summaries
- **Location Management**: Detailed view of products and inventory levels per location
- **CSV Upload**: Support for iOS Vending Systems and Cantaloupe Systems CSV formats with automatic detection
- **Inventory Tracking**: Real-time inventory updates based on sales data
- **Low Stock Alerts**: Visual indicators for items needing restocking
- **Data Conflict Resolution**: Intelligent handling of overlapping locations and product conflicts
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Backend**: Supabase (Database, Auth, API)
- **Database**: PostgreSQL with real-time subscriptions
- **Authentication**: Supabase Auth with email confirmation

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Ashir-zuhaib/Vendhub-Inventory-Management
cd vending-machine-inventory
npm install
```

### 2. Environment Setup

Copy the environment example file and fill in your Supabase credentials:

```bash
cp env.example .env.local
```

Edit `.env.local` with your Supabase project details:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Database Setup

**Run the complete database setup script in your Supabase SQL editor:**

```sql
-- Copy and paste the contents of scripts/fix-database.sql
-- This creates all necessary tables, views, triggers, and functions
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 CSV Upload Formats

The system automatically detects and processes two different CSV formats:

### Format A (iOS Vending Systems)
```csv
Location_ID,Product_Name,Scancode,Trans_Date,Price,Total_Amount
2.0_SW_02,Celsius Arctic,889392014,06/09/2025,3.50,3.82
2.0_SW_02,Muscle Milk,520000519,06/09/2025,3.50,3.82
```

### Format B (Cantaloupe Systems)
```csv
Site_Code,Item_Description,UPC,Sale_Date,Unit_Price,Final_Total
SW_02,Celsius Arctic Berry,889392014,2025-06-09,3.50,3.82
SW_02,Muscle Milk Vanilla,520000519,2025-06-09,3.50,3.82
```

## 🔄 Data Processing

The system processes CSV files and:

1. **Detects Format**: Automatically identifies iOS Vending Systems vs Cantaloupe Systems
2. **Normalizes Data**: Converts both formats into a unified schema
3. **Creates Entities**: 
   - Locations (from Location_ID/Site_Code)
   - Products (from Product_Name/Item_Description and Scancode/UPC)
   - Sales records (with calculated quantities)
4. **Updates Inventory**: Automatically calculates and updates inventory levels
5. **Prevents Duplicates**: Uses hash verification to avoid duplicate processing

## 🔄 Data Processing Challenge

The system handles the complex challenge of processing CSV files from overlapping locations with different field names and formats:

- **Format Detection**: Automatically identifies iOS Vending Systems vs Cantaloupe Systems
- **Data Normalization**: Converts both formats into unified schema
- **Inventory Updates**: Updates stock levels based on sales data
- **Conflict Resolution**: Handles data conflicts intelligently
- **Data Integrity**: Maintains consistency during processing

## 🚀 Deployment

This application is deployed on **Vercel** for production use. The deployment includes:

- **Automatic Builds**: Connected to the main branch for continuous deployment
- **Environment Variables**: Securely configured for production
- **Performance Optimization**: Built with Next.js 15 for optimal performance
- **Global CDN**: Fast loading times worldwide
- **SSL Certificate**: Secure HTTPS connections

The production environment is automatically updated whenever changes are pushed to the main branch.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the Supabase documentation
- Review Next.js documentation

## 🔄 Updates

Stay updated with the latest changes by:
- Following the repository
- Checking the releases page
- Reading the changelog 