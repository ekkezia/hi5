# Hi5 - Hand Tracking Application

This application uses ml5.js for hand tracking and Socket.IO for real-time communication between clients.

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
4. Start the development server:
   ```
   npm start
   ```
5. Open your browser and navigate to `http://localhost:3000`

## Deploying to Vercel

### Option 1: Deploy with Vercel CLI

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy the application:
   ```
   vercel
   ```

4. For production deployment:
   ```
   vercel --prod
   ```

### Option 2: Deploy with GitHub Integration

1. Push your code to a GitHub repository
2. Import the project in the Vercel dashboard
3. Configure the project settings
4. Deploy

## Environment Variables

Make sure to set the following environment variables in your Vercel project settings:

- `PORT`: The port number (Vercel will override this in production)

## Project Structure

- `server.js`: Express server with Socket.IO integration
- `public/`: Static files served by Express
  - `index.html`: Main HTML file
  - `sketch.js`: p5.js and ml5.js implementation for hand tracking
  - `style.css`: Styling for the application
- `vercel.json`: Vercel deployment configuration

## Technologies Used

- Express.js: Web server
- Socket.IO: Real-time communication
- ml5.js: Machine learning library for hand tracking
- p5.js: Creative coding library for visualization
- Vercel: Deployment platform