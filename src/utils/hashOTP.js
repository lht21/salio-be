import crypto from 'crypto'

const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex')
}

export default hashOTP