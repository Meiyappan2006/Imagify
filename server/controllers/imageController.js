import axios from "axios";
import userModel from "../models/userModel.js";
import FormData from "form-data";
import jwt from "jsonwebtoken";

export const generateImage = async (req, res) => {
    try {
        const { prompt } = req.body;
        const token = req.headers.token;

        if (!token) {
            return res.json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);

        if (!user || !prompt) {
            return res.json({success: false, message: "Missing required fields"});
        }

        if (user.creditBalance <= 0){
            return res.json({
                success: false,
                message: "Insufficient credits",
                creditBalance: user.creditBalance
            });
        }

        const formData = new FormData();
        formData.append('prompt', prompt);

        const {data} = await axios.post(
            'https://clipdrop-api.co/text-to-image/v1',
            formData,
            {
                headers: {
                    'x-api-key': process.env.CLIPDROP_API,
                },
                responseType: 'arraybuffer'
            }
        );

        const base64Image = Buffer.from(data, 'binary').toString('base64');
        const resultImage = `data:image/png;base64,${base64Image}`;

        // 🔥 atomically decrement and get updated user
        const updatedUser = await userModel.findByIdAndUpdate(
            user._id,
            { $inc: { creditBalance: -1 } },
            { new: true }
        );

        return res.json({
            success: true,
            message: "Image Generated",
            creditBalance: updatedUser.creditBalance,
            resultImage
        });

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: "Image generation failed"});
    }
};

