---
title: Sentiment analysis 👍 👎 on Twitter using Word2vec and Keras
date: 2017-04-20 10:10:00 # YYYY-MM-DD - H:M:S
author: Ahmed BESBES
tags: ['nlp', 'word2vec', 'doc2vec', 'deep learning', 'keras', 'neural networks', 'twitter', 'sentiment analysis']
excerpt: Learn how to perform sentiment analysis on tweets using the word2vec embedding model and neural networks via Keras
slug: sentiment-analysis-with-keras-and-word-2-vec
folder: /blog/3-sentiment-anlysis-with-keras
ogimage: images/cover-sentiment.jpg
---


## 1 - Introduction 🚀

In this post I am exploring a new way of doing sentiment analysis. I'm going to use **word2vec**.

word2vec is a group of Deep Learning models developed by Google with the aim of capturing the context of words while at the same time proposing a very efficient way of preprocessing raw text data. This model takes as input a large corpus of documents like tweets or news articles and generates a vector space of typically several hundred dimensions. Each word in the corpus is being assigned a unique vector in the vector space.

The powerful concept behind word2vec is that word vectors that are close to each other in the vector space represent words that are not only of the same meaning but of the same context as well.

What I find interesting about the vector representation of words is that it automatically embeds several features that we would normally have to handcraft ourselves. Since word2vec relies on Deep Neural Nets to detect patterns, we can rely on it to detect multiple features on different levels of abstractions.

Let's look at these two charts I found in this <a href="http://sebastianruder.com/secret-word2vec/"> blog </a>. They visualize some word vectors projected on 2D space after a dimensionality reduction.

![](images/w2v_1.jpg)

A couple of things to notice:

- On the right chart, the words of similar meaning, concept and context are grouped together. For example, niece, aunt and sister are close to each other since they describe females and family relationships. Similarly, countess, duchess and empress are grouped together because they represent female royalty.
The second thing to see from this chart is that the geometric distance between words translates a semantic relationship. For example, the vector woman - man is somewhat colinear to the vector queen - king something we would translate to *"woman is to man as queen is to king"*. This means that word2vec is able to infer different relationships between words. Something that we human do naturally.

- The chart on the left is quite similar to the one on the right except that it translates the syntaxic relationships between words. slow - slowest = short - shortest is such an example.

On a more general level, word2vec embeds non trivial semantic and syntaxic relationships between words. This results in preserving a rich context.

In this post we'll be applying the power of word2vec to build a sentiment classifier. We'll use a large dataset of 1.5 million tweets where each tweet is labeled 1 when it's positive and 0 when it's negative. The word2vec model will learn a represenation for every word in this corpus, a represenation that we'll use to transform tweets, i.e sentences, into vectors as well. Then we'll use this new represenation of tweets to train a Neural Network classifier by Keras (since we already have the labels.)

Do you see how **useful** word2vec is for this text classification problem? It provides enhanced feature engineering for raw text data (not the easiest form of data to process when building classifiers.)

Ok now let's put some word2vec in action on this dataset.

## 2 - Environment set-up and data preparation

Let's start by setting up the environment.

To have a clean installation that would not mess up my current python packages, I created a conda virtual environment named **nlp**  on an Ubuntu 16.04 LTS machine. The python version is 2.7.

```shell
conda create -n nlp python=2.7 anaconda
```
Now activate the environment.

```shell
source activate nlp
```

Inside this virtual environment, we'll need to install these libraries:

* <a href="https://radimrehurek.com/gensim/">gensim</a> is a natural language processing python library. It makes text mining, cleaning and modeling very easy. Besides,  it provides an implementation of the word2vec model.

* <a href="https://keras.io/">Keras</a> is a high-level neural networks API, written in Python and capable of running on top of either TensorFlow or Theano. We'll be using it to train our sentiment classifier. In this tutorial, it will run on top of TensorFlow.

* <a href="https://www.tensorflow.org/">TensorFlow</a> is an open source software library for machine learning. It's been developed by Google to meet their needs for systems capable of building and training neural networks.

* <a href="http://bokeh.pydata.org/en/latest/">Bokeh</a> is a Python interactive visualization library that targets modern web browsers for presentation. Its goal is to provide elegant, concise construction of novel graphics in the style of D3.js, and to extend this capability with high-performance interactivity over very large or streaming datasets.  

* <a href="https://pypi.python.org/pypi/tqdm">tqdm</a> is cool progress bar utility package I use to monitor dataframes creation (Yes, It integrates with pandas) and loops.

Demo:

<div align="center">
    <img src="./images/tqdm.gif" width="100%">
</div>

Cool, hein?

```shell
pip install --upgrade gensim
pip install nltk
pip install tqdm
pip install --upgrade https://storage.googleapis.com/tensorflow/linux/cpu/tensorflow-1.0.1-cp27-none-linux_x86_64.whl
pip install keras
pip install bokeh
```

The environment should now be ready.

The dataset can be downloaded from this <a href="https://drive.google.com/uc?id=0B04GJPshIjmPRnZManQwWEdTZjg&export=download">link</a>. It's a csv file that contains **1.6 million rows**. Each row has amongst other things the text of the tweet and the corresponding sentiment.

Let's load the python libraries and have a look at the dataset.

```python
import pandas as pd # provide sql-like data manipulation tools. very handy.
pd.options.mode.chained_assignment = None
import numpy as np # high dimensional vector computing library.
from copy import deepcopy
from string import punctuation
from random import shuffle

import gensim
from gensim.models.word2vec import Word2Vec # the word2vec model gensim class
LabeledSentence = gensim.models.doc2vec.LabeledSentence # we'll talk about this down below

from tqdm import tqdm
tqdm.pandas(desc="progress-bar")

from nltk.tokenize import TweetTokenizer # a tweet tokenizer from nltk.
tokenizer = TweetTokenizer()

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
```

Let's define a function that loads the dataset and extracts the two columns we need:

- The sentiment: a binary (0/1) variable
- The text of the tweet: string

```python
def ingest():
    data = pd.read_csv('./tweets.csv')
    data.drop(['ItemID', 'SentimentSource'], axis=1, inplace=True)
    data = data[data.Sentiment.isnull() == False]
    data['Sentiment'] = data['Sentiment'].map(int)
    data = data[data['SentimentText'].isnull() == False]
    data.reset_index(inplace=True)
    data.drop('index', axis=1, inplace=True)
    print 'dataset loaded with shape', data.shape    
    return data

data = ingest()
data.head(5)
```

|Sentiment|SentimentText|
|---|---|
|1|@jonah_bailey Sorry about the loss. I have been there and it sucks. Have a great day!|
|0|I think I pulled a pectoral muscle.  And no, I'm not kidding.|
|1|My room is TRASHED|
|1|Raining.|
|0|at work  the stupidst job in the world LoL I can't wait until my last day YAY!

The format of the SentimenText is not useful. It needs to be tokenized and cleaned.  

We will limit to 1 million tweets.

Here's my tokenizing function that splits each tweet into tokens and removes user mentions, hashtags and urls. These elements are very common in tweets but unfortunately they do not provide enough semantic information for the task. If you manage to sucessfully integrate them in the final classification, please tell me your secret.

```python
def tokenize(tweet):
    try:
        tweet = unicode(tweet.decode('utf-8').lower())
        tokens = tokenizer.tokenize(tweet)
        tokens = filter(lambda t: not t.startswith('@'), tokens)
        tokens = filter(lambda t: not t.startswith('#'), tokens)
        tokens = filter(lambda t: not t.startswith('http'), tokens)
        return tokens
    except:
        return 'NC'
```

The results of the tokenization should now be cleaned to remove lines with 'NC', resulting from a tokenization error (usually due to weird encoding.)

```python
def postprocess(data, n=1000000):
    data = data.head(n)
    data['tokens'] = data['SentimentText'].progress_map(tokenize)  ## progress_map is a variant of the map function plus a progress bar. Handy to monitor DataFrame creations.
    data = data[data.tokens != 'NC']
    data.reset_index(inplace=True)
    data.drop('index', inplace=True, axis=1)
    return data

data = postprocess(data)
```

The data is now tokenized and cleaned. We are ready to feed it in the word2vec model.

## 3 - Building the word2vec model

First, let's define a training set and a test set.

```python
x_train, x_test, y_train, y_test = train_test_split(np.array(data.head(n).tokens),
                                                    np.array(data.head(n).Sentiment), test_size=0.2)
```

Before feeding lists of tokens into the word2vec model, we must turn them into LabeledSentence objects beforehand. Here's how to do it:

```python
def labelizeTweets(tweets, label_type):
    labelized = []
    for i,v in tqdm(enumerate(tweets)):
        label = '%s_%s'%(label_type,i)
        labelized.append(LabeledSentence(v, [label]))
    return labelized

x_train = labelizeTweets(x_train, 'TRAIN')
x_test = labelizeTweets(x_test, 'TEST')
```

Let's check the first element from x_train.

```python
x_train[0]

# TaggedDocument(words=[u'thank', u'you', u'!', u'im', u'just', u'a', u'tad', u'sad', u'u', u'r', u'off', u'the', u'market', u'tho', u'...'], tags=['TRAIN_0'])
```


Ok so each element is basically some object with two attributes: a list (of tokens) and a label.

Now we are ready to build the word2vec model from  **x_train** i.e. the corpus.

```python
tweet_w2v = Word2Vec(size=n_dim, min_count=10)
tweet_w2v.build_vocab([x.words for x in tqdm(x_train)])
tweet_w2v.train([x.words for x in tqdm(x_train)])
```

The code is self-explanatory.

* On the first line the model is initialized with the dimension of the vector space (we set it to 200) and min_count (a threshold for filtering words that appear less)

* On the second line the vocabulary is created.

* On the third line the model is trained i.e. its weights are updated.

Once the model is built and trained on the corpus of tweets, we can use it to convert words to vectors. Here's an example:

```python
tweet_w2v['good']

#  array([-1.04697919,  0.79274398,  0.23612066,  0.05131698,  0.0884205 ,
#        -0.08569263,  1.45526719,  0.42579028, -0.34688851, -0.08249081,
#         0.45873582,  2.36241221,  1.05570769, -1.99480379, -1.80352235,
#        -0.15522274, -0.20937157, ..., 1.58423829], dtype=float32)
```

You can check: this is a 200-dimension vector. Of course, we can only get the vectors of the words of the corpus.

Let's try something else. We spoke earlier about semantic relationships. Well, the Word2Vec gensim implementation provides a cool method named most_similar.
Given a word, this method returns the top n similar ones. This is an interesting feature. Let's try it on some words:

```python
tweet_w2v.most_similar('good')

# [(u'goood', 0.7355118989944458),
#  (u'great', 0.7164269685745239),
#  (u'rough', 0.656904935836792),
#  (u'gd', 0.6395257711410522),
#  (u'goooood', 0.6351571083068848),
#  (u'tough', 0.6336284875869751),
#  (u'fantastic', 0.6223267316818237),
#  (u'terrible', 0.6179217100143433),
#  (u'gooood', 0.6099461317062378),
#  (u'gud', 0.6096700429916382)]

tweet_w2v.most_similar('bar')

# [(u'pub', 0.7254607677459717),
#  (u'restaurant', 0.7147054076194763),
#  (u'cafe', 0.7105239629745483),
#  (u'table', 0.6781781911849976),
#  (u'ranch', 0.6559066772460938),
#  (u'club', 0.6470779180526733),
#  (u'panera', 0.6464691162109375),
#  (u'bakery', 0.6429882049560547),
#  (u'grill', 0.6425997018814087),
#  (u'gate', 0.6346235275268555)]

tweet_w2v.most_similar('facebook')

# [(u'fb', 0.8862842321395874),
#  (u'myspace', 0.8414138555526733),
#  (u'bebo', 0.7763116359710693),
#  (u'yahoo', 0.7672140598297119),
#  (u'msn', 0.7638905048370361),
#  (u'twitter', 0.7276350259780884),
#  (u'tumblr', 0.7209618091583252),
#  (u'flickr', 0.712773323059082),
#  (u'skype', 0.7116719484329224),
#  (u'aim', 0.7065393924713135)]

tweet_w2v.most_similar('iphone')

# [(u'itouch', 0.7907721996307373),
#  (u'blackberry', 0.7342787981033325),
#  (u'firmware', 0.7048080563545227),
#  (u'jailbreak', 0.7042940855026245),
#  (u'mac', 0.7014051675796509),
#  (u'3gs', 0.697465717792511),
#  (u'pc', 0.6917887330055237),
#  (u'upgrade', 0.6857078075408936),
#  (u'mms', 0.6838993430137634),
#  (u'3.0', 0.6824861764907837)]
```

How **awesome** is that?

For a given word, we get similar surrounding words of same context. Basically these words have a probability to be closer to that given word in most of the tweets.

It's interesting to see that our model gets facebook, twitter, skype together and bar, restaurant and cafe together as well. This could be useful for building a knowledge graph. Any thoughts about that?

How about visualizing these word vectors? We first have to reduce their dimension to 2 using t-SNE.
Then, using an interactive visualization tool such as Bokeh, we can map them directly on 2D plane and interact with them.

Here's the script, and the bokeh chart below.

```python
# importing bokeh library for interactive dataviz
import bokeh.plotting as bp
from bokeh.models import HoverTool, BoxSelectTool
from bokeh.plotting import figure, show, output_notebook

# defining the chart
output_notebook()
plot_tfidf = bp.figure(plot_width=700, plot_height=600, title="A map of 10000 word vectors",
    tools="pan,wheel_zoom,box_zoom,reset,hover,previewsave",
    x_axis_type=None, y_axis_type=None, min_border=1)

# getting a list of word vectors. limit to 10000. each is of 200 dimensions
word_vectors = [tweet_w2v[w] for w in tweet_w2v.wv.vocab.keys()[:5000]]

# dimensionality reduction. converting the vectors to 2d vectors
from sklearn.manifold import TSNE
tsne_model = TSNE(n_components=2, verbose=1, random_state=0)
tsne_w2v = tsne_model.fit_transform(word_vectors)

# putting everything in a dataframe
tsne_df = pd.DataFrame(tsne_w2v, columns=['x', 'y'])
tsne_df['words'] = tweet_w2v.wv.vocab.keys()[:5000]

# plotting. the corresponding word appears when you hover on the data point.
plot_tfidf.scatter(x='x', y='y', source=tsne_df)
hover = plot_tfidf.select(dict(type=HoverTool))
hover.tooltips={"word": "@words"}
show(plot_tfidf)
```

<iframe width=100% height=620 frameBorder="0" src="https://s3.eu-west-3.amazonaws.com/ahmedbesbes.com/plot.html"></iframe>

Zoom in, zoom out, place the cursor wherever you want and navigate in the graph. When clicking on a point, you can see the corresponding word. Convince yourself that grouped data points correspond to words of similar context.

## 4 - Building a sentiment classifier

Let's now get to the sentiment classification part. As for now, we have a word2vec model that converts each word from the corpus into a high dimensional vector. This seems to work fine according to the similarity tests and the bokeh chart.

In order to classify tweets, we have to turn them into vectors as well. How could we do this? Well, this task is almost done. Since we know the vector representation of each word composing a tweet, we have to "combine" these vectors together and get a new one that represents the tweet as a whole.

A first approach consists in averaging the word vectors together. But a slightly better solution I found was to compute a weighted average where each weight gives the importance of the word with respect to the corpus. Such a weight could the tf-idf score. To learn more about tf-idf, you can look at my <a href="http://ahmedbesbes.com/how-to-mine-newsfeed-data-and-extract-interactive-insights-in-python.html">previous article</a>.

Let's start by building a tf-idf matrix.

```python
print 'building tf-idf matrix ...'
vectorizer = TfidfVectorizer(analyzer=lambda x: x, min_df=10)
matrix = vectorizer.fit_transform([x.words for x in x_train])
tfidf = dict(zip(vectorizer.get_feature_names(), vectorizer.idf_))
print 'vocab size :', len(tfidf)
```

Now let's define a function that, given a list of tweet tokens, creates an averaged tweet vector.

```python
def buildWordVector(tokens, size):
    vec = np.zeros(size).reshape((1, size))
    count = 0.
    for word in tokens:
        try:
            vec += tweet_w2v[word].reshape((1, size)) * tfidf[word]
            count += 1.
        except KeyError: # handling the case where the token is not
                         # in the corpus. useful for testing.
            continue
    if count != 0:
        vec /= count
    return vec
```

Now we convert x_train and and x_test into list of vectors using this function.
We also scale each column to have zero mean and unit standard deviation.


```python
from sklearn.preprocessing import scale
train_vecs_w2v = np.concatenate([buildWordVector(z, n_dim) for z in tqdm(map(lambda x: x.words, x_train))])
train_vecs_w2v = scale(train_vecs_w2v)

test_vecs_w2v = np.concatenate([buildWordVector(z, n_dim) for z in tqdm(map(lambda x: x.words, x_test))])
test_vecs_w2v = scale(test_vecs_w2v)
```


We should now be ready to feed these vectors into a neural network classifier. In fact, using Keras is very easy to define layers and activation functions.

Here is a basic 2-layer architecture.


```python
model = Sequential()
model.add(Dense(32, activation='relu', input_dim=200))
model.add(Dense(1, activation='sigmoid'))
model.compile(optimizer='rmsprop',
              loss='binary_crossentropy',
              metrics=['accuracy'])

model.fit(train_vecs_w2v, y_train, epochs=9, batch_size=32, verbose=2)
```

Now that the model is trained, let's evaluate it on the test set:

```python
score = model.evaluate(test_vecs_w2v, y_test, batch_size=128, verbose=2)
print(score[1])
# 0.78984528240986307
```

Almost **80%** accuracy. This is not bad. We could eventually tune more parameters in the word2vec model and the neural network classifer to reach a higher precision score. Please tell me if you managed to do so.

## 5 - Conclusion

In this post we explored different tools to perform sentiment analysis: We built a tweet sentiment classifier using word2vec and Keras.

The combination of these two tools resulted in a 79% classification model accuracy.

This Keras model can be saved and used on other tweet data, like streaming data extracted through the <a href="http://docs.tweepy.org/en/v3.5.0/">tweepy</a> API. It could be interesting to wrap this model around a web app with some D3.js visualization dashboard too.

Regarding the improvement of this classifier, we can investigate the doc2vec model that extracts vectors out of sentences and paragraphs. I have first tried this model but I got a lower accuracy score of 69%. So please tell me if you can get better.

I hope this tutorial was a good introductory start to word embedding. Since I'm still learning my way through this awesome topic I'm open to suggestion or any recommendation.