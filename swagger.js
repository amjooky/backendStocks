const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Dynamic server configuration based on environment
const getServers = () => {
  const servers = [];
  
  // In production, prioritize production server
  if (process.env.NODE_ENV === 'production') {
    servers.push({
      url: 'https://backendstocks.onrender.com',
      description: 'Production server (Render)'
    });
    servers.push({
      url: 'http://localhost:5000',
      description: 'Development server'
    });
  } else {
    // In development, prioritize local server
    servers.push({
      url: 'http://localhost:5000',
      description: 'Development server'
    });
    servers.push({
      url: 'https://backendstocks.onrender.com',
      description: 'Production server (Render)'
    });
  }
  
  return servers;
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stock Management System API',
      version: '1.0.0',
      description: `
        # Stock Management System API
        
        Comprehensive REST API for inventory management, point-of-sale operations, customer management, and analytics.
        
        ## Features
        - **Authentication & Authorization** - JWT-based auth with role-based access
        - **Product Management** - Complete CRUD operations for products
        - **Inventory Tracking** - Real-time stock management and movements
        - **Point of Sale** - Full POS functionality with sales processing
        - **Customer Management** - Customer database with loyalty points
        - **Analytics & Reports** - Sales analytics and business intelligence
        - **Promotions** - Discount and promotion management
        - **User Management** - Multi-role user system (Admin/Manager/Cashier)
        
        ## Getting Started
        1. **Login** using the \`POST /api/auth/login\` endpoint with credentials:
           - Username: \`admin\`
           - Password: \`admin123\`
        2. **Copy the JWT token** from the response
        3. **Click 'Authorize'** button and enter \`Bearer <your-token>\`
        4. **Test any endpoint** - all are now authenticated and ready to use!
        
        ## Default Credentials
        - **Admin User**: admin / admin123
      `,
      contact: {
        name: 'API Support',
        email: 'support@stocksystem.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'cashier'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Supplier: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            contact_person: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            sku: { type: 'string' },
            barcode: { type: 'string' },
            category_id: { type: 'integer' },
            supplier_id: { type: 'integer' },
            cost_price: { type: 'number', format: 'float' },
            selling_price: { type: 'number', format: 'float' },
            min_stock_level: { type: 'integer' },
            current_stock: { type: 'integer' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            loyalty_points: { type: 'integer' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Promotion: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['percentage', 'fixed', 'buy_x_get_y'] },
            value: { type: 'number', format: 'float' },
            min_quantity: { type: 'integer' },
            max_uses: { type: 'integer' },
            current_uses: { type: 'integer' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Sale: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            sale_number: { type: 'string' },
            customer_id: { type: 'integer' },
            cashier_id: { type: 'integer' },
            subtotal: { type: 'number', format: 'float' },
            discount_amount: { type: 'number', format: 'float' },
            tax_amount: { type: 'number', format: 'float' },
            total_amount: { type: 'number', format: 'float' },
            payment_method: { type: 'string', enum: ['cash', 'card', 'mobile', 'mixed'] },
            payment_status: { type: 'string', enum: ['pending', 'completed', 'refunded'] },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                  location: { type: 'string' }
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Unauthorized - Invalid or missing token'
                  }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Access denied - Manager role required'
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'] // Path to the API docs
};

const specs = swaggerJSDoc(options);

module.exports = { specs, swaggerUi };
