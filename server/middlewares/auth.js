import jwt from 'jsonwebtoken';

const userAuth = async (req, res, next) => {
    try {
        const { token } = req.headers;
        
        if (!token) {
            return res.json({ 
                success: false, 
                message: 'Not Authorized. Please login again.' 
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Initialize req.body if it doesn't exist
        if (!req.body) {
            req.body = {};
        }
        
        // Set userId on req.body
        req.body.userId = decoded.id;
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.json({ 
            success: false, 
            message: 'Invalid token. Please login again.' 
        });
    }
};

export default userAuth;