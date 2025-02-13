const auth = (req, res, next) => {
    const token = req.session.admin;
    if (token) {
        next();
    } else {
    
        req.session.error = 'Access denied!';
        res.status(401).redirect('/login-admin');
    }
}

module.exports = auth;