//Software Platform for Managing Payment Transactions of Employees: Development of a platform to streamline employee payment processing.
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { employeeRouter } from './routes/employee.js';
import { adminRouter } from './routes/admin.js';
import { organizationRouter } from './routes/organization.js';


dotenv.config();
 
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, 'payroll-frontend', 'dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

app.use(express.json());
app.use(cors());


app.use('/employee/v1', employeeRouter);
app.use('/admin/v1', adminRouter);
app.use('/organization/v1', organizationRouter);

if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get(/.*/, (req, res, next) => {
        const isApiRoute =
            req.path.startsWith('/employee/v1') ||
            req.path.startsWith('/admin/v1') ||
            req.path.startsWith('/organization/v1');

        if (isApiRoute) {
            return res.status(404).json({ error: 'API route not found' });
        }

        return res.sendFile(frontendIndexPath);
    });
}


app.use((err, req, res, next)=>{
    console.error(err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({error: err.message || "Fatal error occurred."});
});


async function main(){
    await mongoose.connect(process.env.MONGO_URI);
    app.listen(process.env.PORT, ()=>{
        console.log("Connected to DB and Server is running");
    });
}

main();