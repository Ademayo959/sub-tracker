import mongoose from "mongoose"
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import jwt from 'jsonwebtoken'
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/env.js";

export const signUp = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Logic to create a new user
        const { name, email, password } = req.body
        //check if the user already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            const error = new Error('User already exists');
            error.statusCode = 409;
            throw error;
        }
        // Hash Password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        //Create new user
        const newUsers = await User.create([{ name, email, password: hashedPassword }], { session })
        //create token for the user
        const token = jwt.sign({ userId: newUsers[0]._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
        //End session
        await session.commitTransaction();
        //Send a response
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                token,
                user: {
                    id: newUsers[0]._id,
                    name: newUsers[0].name,
                    email: newUsers[0].email,
                }
            }
        })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        next(error);
    } finally {
        await session.endSession();
    }
};

export const signIn = async (req, res, next) => {
    try {
        const { email, password } = req.body
        //chack if user exist
        const user = await User.findOne({ email })
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404
            throw error
        }
        //validate user password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            const error = new Error("Invalid Password");
            error.statusCode = 404
            throw error
        }
        //genarate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
        //return a result
        res.status(200).json({
            success: true,
            message: 'User signed in successfully',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                }
            }
        })

    } catch (error) {
        next(error)
    }
}

export const signOut = async (req, res, next) => {

}