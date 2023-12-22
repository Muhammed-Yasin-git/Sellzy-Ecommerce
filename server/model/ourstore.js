exports.ourStore = (req, res) => {
    const catFilter = req.query.catFilter;
    const searchQuery = req.query.search;
    const min=req.query.min
    const max=req.query.max
    const page = req.query.page || 1;
    const itemsPerPage = 6;
    req.session.priceError=false
    const filter = { catStatus: true, unlist: false };    const skipCount = (page - 1) * itemsPerPage;
  
  
  
  
    if (catFilter) {
      filter.category = catFilter;
    }
  
    if (min && max) {
      if(max>min){
      filter.discountedPrice = { $gte: parseInt(min), $lte: parseInt(max) };
      }else{
       req.session.priceError=true
      }
    } else if (min) {
      filter.discountedPrice = { $gte: parseInt(min) };
    } else if (max) {
      filter.discountedPrice = { $lte: parseInt(max) }; 
    }
  
    if (searchQuery) {
      filter.$or = [
        { pname: { $regex: new RegExp(searchQuery, 'i') } },
        { category: { $regex: new RegExp(searchQuery, 'i') } }
      ];
    }
    productDb.find(filter)
      .then(allData => {
        catogorydb.find({ status: true })
        .then(catData => {
          const totalProducts = allData.length;
          const totalPages = Math.max(1, Math.ceil(totalProducts / itemsPerPage));
          const skipCount = (page - 1) * itemsPerPage;
          const data = allData.slice(skipCount, skipCount + itemsPerPage);
          res.render("our-store", {
            products: data,
            email: req.session.isAuth,
            catogories: catData,
            searchQuery,  
            catFilter,   
            priceError:req.session.priceError,
            min:min,
            max:max,
            currentPage: parseInt(page),  
            totalPages: totalPages
          },(error,html)=>{
            if(error){
              return 
            }    
            delete req.session.priceError 
            res.send(html)
          });
    
          })
      })
      .catch(error => {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
      });
  };