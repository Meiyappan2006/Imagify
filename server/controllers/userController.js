import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import transactionModel from "../models/transcationModel.js";
import { error } from "console";
import axios from "axios";

const registerUser = async (req, res) => {
    try {
        const {name, email, password} = req.body;
        if(!name || !email || !password){
            return res.json({success: false, message: "All fields are required"});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userData = {
            name,
            email,
            password: hashedPassword
        };
        const newUser = new userModel(userData);
        const user = await newUser.save();
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
        
        res.json({
            success: true,
            token,
            user: {
                name: user.name,
                creditBalance: user.creditBalance
            }
        });
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "Registration failed"}); 
    }
};

const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await userModel.findOne({email});
        if(!user){
            return res.json({success: false, message: "User not found"});
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.json({success: false, message: "Invalid credentials"});
        }else{
            const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
            
            res.json({
                success: true,
                token,
                user: {
                    name: user.name,
                    creditBalance: user.creditBalance
                }
            });
        }
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "Login failed"});
    }
};

const userCredits = async (req, res) => {
    try {
        const token = req.headers.token;
        if (!token) {
            return res.json({ success: false, message: "No token provided" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        return res.json({
            success: true,
            credits: user.creditBalance,
            user: { 
                name: user.name,
                creditBalance: user.creditBalance
            }
        });
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "Failed to fetch user credits"});
    }
};

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentRazorpay = async (req, res) => {
    try {
        const {userId, planId} = req.body; 
        const userData = await userModel.findById(userId);

        if (!userData || !planId) {
            return res.json({ success: false, message: "Invalid user or plan" });
        }

        let credits, plan, amount, date

        switch (planId) {
            case 'Basic':
                plan = 'Basic';
                credits = 100;
                amount = 10;
                break;
            
            case 'Advanced':
                plan = 'Advanced';
                credits = 500;
                amount = 50;
                break;

            case 'Business':
                plan = 'Business';
                credits = 5000;
                amount = 250;
                break;

            default:
                return res.json({ success: false, message: "Invalid plan selected" });
        }

        date = Date.now();

        const transactionData = {
            userId, plan, amount, credits, date
        }

        const newTransaction = await transactionModel.create(transactionData);

        const options = {
            amount: amount * 100,
            currency: process.env.CURRENCY,
            receipt: newTransaction._id.toString(),
        }

        // Fix: Use razorpayInstance.orders.create (note: 'orders' not 'order')
        // and use Promise-based approach instead of callback
        const order = await razorpayInstance.orders.create(options);
        
        res.json({
            success: true, 
            order
        });

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message || "Razorpay payment initiation failed"});
    }
}

const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, userId } = req.body;
        
        if (!razorpay_order_id) {
            return res.json({ success: false, message: 'Order ID is required' });
        }

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
        console.log('Order Info:', orderInfo);
        
        if (orderInfo.status === 'paid') {
            const transactionData = await transactionModel.findById(orderInfo.receipt);
            
            if (!transactionData) {
                return res.json({ success: false, message: 'Transaction not found' });
            }
            
            if (transactionData.payment) {
                // If already processed, just return the current balance
                const userData = await userModel.findById(transactionData.userId);
                return res.json({ 
                    success: true, 
                    message: 'Payment already processed',
                    credits: userData.creditBalance,
                    creditBalance: userData.creditBalance
                });
            }
            
            const userData = await userModel.findById(transactionData.userId);
            
            if (!userData) {
                return res.json({ success: false, message: 'User not found' });
            }
            
            const creditBalance = userData.creditBalance + transactionData.credits;
            
            // Update user credits
            await userModel.findByIdAndUpdate(userData._id, { creditBalance });
            await transactionModel.findByIdAndUpdate(transactionData._id, { payment: true });
            
            console.log('Credits updated successfully:', creditBalance);
            
            // Return the updated credit balance
            res.json({ 
                success: true, 
                message: 'Credits Added',
                credits: creditBalance,
                creditBalance: creditBalance
            });
        } else {
            res.json({ success: false, message: 'Payment not completed yet' });
        }
    } catch (error) {
        console.error('Verify Razorpay Error:', error);
        res.json({ success: false, message: error.message });
    }
}

export {registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay};