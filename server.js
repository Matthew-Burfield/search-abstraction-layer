const express = require('express')
const axios = require('axios')
const mongodb = require('mongodb')

const app = express()

const MONGO_USER = 'search_app_admin'
const MONGO_URL = `mongodb://${MONGO_USER}:${process.env.MONGO_PASSWORD}@ds119081.mlab.com:19081/image-search-abstraction`

const mapAPI = (response) => {
  return response.map(obj => {
    return {
      imageURL: obj.link,
      altText: obj.title,
      pageUrl: 'http://imgur.com'
    }
  })
}

const addToRecentEntries = entry => {
  mongodb.MongoClient.connect(MONGO_URL, function (err, db) {
    if (err) throw err

    const recentSearches = db.collection('recentsearches')


    recentSearches.insert({
      term: entry,
      when: new Date().toString()
    }, function (err, result) {
      if (err) throw err
    })


    db.close(function (err) {
      if (err) throw err
    })
  })
}

const getLatestEntries = (callback) => {
  mongodb.MongoClient.connect(MONGO_URL, (err, db) => {
    if (err) throw err

    const collection = db.collection('recentsearches')

    collection.find().sort({ when: -1 }).toArray((err, docs) => {
      if (err) throw err

      db.close(err => {
        if (err) throw err
      })
      callback(docs)
    })

    // recentSearches.find().toArray((err, arr) => {
    //   if (err) throw err
    //   latestEntries = [...arr]
    // })
  })
}

app.get('/recentsearches', function (req, res) {
  getLatestEntries((docs) => res.json(docs))
})

app.get('/api/', function (req, res) {
  const searchString = req.query.search
  const offset = req.query.offset

  if (searchString !== undefined || searchString === '') {
    const baseUrl = 'https://api.imgur.com/3/gallery/search/top'
    const url = `${baseUrl}/${offset || 1}/?q=${searchString}`

    console.log(url)

    axios.get(url, {
      headers: {'Authorization': 'Client-ID f7952ec829d302b'}
    }).then(function (response) {
      addToRecentEntries(searchString)
      res.json(JSON.stringify(mapAPI(response.data.data)))
    }).catch(function (error) {
      if (error) throw error
      res.send('some error occured')
    })
  } else {
    res.json(JSON.stringify({ Error: 'no search string' }))
  }
})

app.listen(process.env.PORT || 8000, function () {
  console.log('app is listening on port', process.env.PORT || 8000)
})
