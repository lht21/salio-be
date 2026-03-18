import mongoose from "mongoose";
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User'},
    action: { type: String, required: true}, //loại hành động vd: 'Post /api/user'
    method: { type: String, required: true}, ///loại hành động chi tiết hơn vd Post, Get, Put, Patch, Delete
    resource: { type: String}, //model bị tác động
    statusCode: { type: Number}, //400, 500, 200
    status: {type: String, enum: ['Success', 'Failed']},

    //chi tiết dữ liệu
    reqBody: { type: Schema.Types.Mixed}, //dự liệU được gửi từ client
    reqQuery: { type: Schema.Types.Mixed}, //tham số gửi kèm trên url

    //thông tin kỹ thuật
    ipAddress: {type: String},
    userAgent: {type: String},

    performedAt: {type: Date, default: Date.now} ///tương tự createAt
}, {timestamps: { createdAt: true, updatedAt: false }})


auditLogSchema.index({ createdAt: 1}, { expireAfterSeconds: 90*24*60*60});


export default mongoose.model('AuditLog', auditLogSchema);