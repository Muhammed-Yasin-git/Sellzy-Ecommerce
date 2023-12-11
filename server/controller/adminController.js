
const Userdb = require("../model/usermodel")




exports.find = (req,res)=>{
    Userdb.find()
    .then(user=>{
        res.send(user)
    })
    .catch(err=>{
        res.status(500).send({message:err.messsage||"Error Occured while retrieving user information"});
    }); 
}

exports.logout = (req, res) => {
    req.session.adminAuthenticated = false
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send({
                message: "Error occurred while logging out",
            });
        }
        // Redirect to the admin-login page after successful logout
        res.redirect("/admin-login");
    });
};



