function deck() {
  return Array.apply(0, Array(52)).map(function (_, b) { return b });
}

function shuffle(cards) {
  return cards.map(function (current, i) {
    var rand = i + Math.floor(Math.random() * (cards.length - i));
    var card = cards[rand];
    cards[rand] = current;
    return card;});
}

function suit(card) {
  return [
    ':clubs:',
    ':diamonds:',
    ':hearts:',
    ':spades:'][Math.floor(card / 13)];
}

function value(card) {
  var card_values = [];
  card_values[0] = 'A';
  card_values[10] = 'J';
  card_values[11] = 'Q';
  card_values[12] = 'K';
  return card_values[card % 13] || card % 13 + 1;
}

function show(hand) {
  if (hand.constructor === Array) {
    return hand.map(show).join(' ') + " (" + score(hand) + ")";
  }
  return value(hand) + suit(hand);
}

function hand_score(hand) {
  var scores = hand.map(score);
  var aces = 0;
  var total = scores.reduce(function (a, b) {
    if (b == 11) aces++;
    return a + b;
  }, 0);
  return {'aces': aces, 'total': total};
}

function score(hand) {
  if (hand.constructor === Array) {
    var score = hand_score(hand);
    while (score.total > 21 && score.aces > 0) {
      score.total -= 10;
      score.aces--;
    }
    return score.total;
  }
  var val = hand % 13 + 1;
  if (val > 10) val = 10;
  if (val == 1) val = 11;
  return val;
}

function soft_17(hand) {
  var score = hand_score(hand);
  return (score.total == 17 && score.aces == 1);
}

function should_hit(hand, hit_on_soft_17) {
  return score(hand) < 17 || (hit_on_soft_17 && soft_17(hand));
}

module.exports = function (robot) {

  function save_game(username, game) {
    robot.brain.set('blackjack_' + username, game);
  }

  function load_game(username) {
    return robot.brain.get('blackjack_' + username);
  }

  function end_game(username) {
    robot.brain.set('blackjack_' + username, null);
  }

  robot.respond(/blackjack/i, function (res) {
    var user = res.message.user.name;
    var game = load_game(user);
    if (game) {
      res.send("You're already playing a game!");
    } else {
      var cards = shuffle(deck());

      var game = {
        'cards': cards,
        'dealer': [],
        'hit_on_soft_17': false,
        'hands': {}};
      game.hands[user] = [];

      game.hands[user].push(cards.pop(1));
      game.dealer.push(cards.pop(1));
      game.hands[user].push(cards.pop(1));

      save_game(user, game);

      res.send(user + "'s hand: " + show(game.hands[user]));
      res.send("Dealer shows: " + show(game.dealer));
    }
  });

  robot.respond(/\bhit( me)?$/, function (res) {
    var user = res.message.user.name;
    var game = load_game(user);
    if (game) {
      game.hands[user].push(game.cards.pop(1));

      res.send(user + "'s hand: " + show(game.hands[user]));

      if (score(game.hands[user]) > 21) {
        res.send('Bust!');
        end_game(user);
      }
    } else {
      res.send("You're not playing a game!");
    }
  });

  robot.respond(/\bfold$/, function (res) {
    var user = res.message.user.name;
    var game = load_game(user);
    if (game) {
      end_game(user);
      res.send('Game over');
    }
  });

  robot.respond(/\b(stick|stay|stand)$/, function (res) {
    var user = res.message.user.name;
    var game = load_game(user);
    if (game) {
      while (should_hit(game.dealer, game.hit_on_soft_17)) {
        game.dealer.push(game.cards.pop(1));
        res.send('Dealer shows: ' + show(game.dealer));
      }
      var dealer = score(game.dealer);
      if (dealer > 21) {
        res.send('Dealer busts! You win!');
      } else if (dealer == 21 && game.dealer.length == 2) {
        res.send('Dealer has Blackjack, you lose!');
      } else if (dealer > score(game.hands[user])) {
        res.send('Dealer scores ' + dealer + ', you lose!');
      } else if (dealer == score(game.hands[user])) {
        res.send('Dealer scores ' + dealer + '. Push!');
      } else {
        res.send('Dealer scores ' + dealer + ', you win!');
      }
      end_game(user);
    } else {
      res.send("You're not playing a game!");
    }
  });

};
