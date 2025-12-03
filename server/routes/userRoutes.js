import express from 'express';
import {registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay} from '../controllers/userController.js';
import userAuth from '../middlewares/auth.js';

const cors = require('cors');

// Add this BEFORE your routes
app.use(cors({
  origin: 'https://imagify-client-n0kg.onrender.com', // Your frontend URL
  credentials: true,
  optionsSuccessStatus: 200
}));

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/credits', userAuth ,userCredits);
userRouter.post('/pay-razor', userAuth, paymentRazorpay);
userRouter.post('/verify-razor', userAuth, verifyRazorpay);

export default userRouter;

