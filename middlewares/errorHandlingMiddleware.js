const errorMiddleware =(err,req,res,next)=>{

    const status=err.status
    // const message=err.message
    // const extraDetails=err.extraDetails
    console.log('hii');
    if(status==404){
        res.render('error404')
    }else{
        res.render('error500')
    }



} 



module.exports=errorMiddleware