
const Userdb = require("../model/usermodel");
const blockDb = require("../model/blockmodel");

exports.block = (req,res)=>{

    const nemail = req.query.email


    blockDb.create({email:nemail})
     .then(data=>{
      Userdb.updateOne({email:nemail},{$set:{block:"true",status:"Inactive"}})
        .then(data=>{
          res.redirect("/admin-users")
        }).catch(err=>{
          res.send(err)
        })
    })
    .catch(err => {
        blockDb.deleteOne({email:nemail})
        .then(data=>{
          Userdb.updateOne({email:nemail},{$set:{block:"false"}})
          .then(data=>{
            res.redirect("/admin-users")
          }).catch(err=>{
            res.send(err)
          })
        })
        .catch(err=>{
          res.send(err);
        })
    });
}

