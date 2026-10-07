// The game follows the player's own clock (daily reset at 04:00, neighbour visit times), so tests pin one time zone:
// the same results on this PC and on GitHub's UTC machines. Import this first in every test file.
process.env.TZ = 'Asia/Seoul';
