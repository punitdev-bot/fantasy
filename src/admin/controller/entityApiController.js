const axios = require("axios");

class entityApiController {
  constructor() {
    return {
      getMatchPlayers: this.getMatchPlayers.bind(this),
      getMatchScore: this.getMatchScore.bind(this),
    };
  }
  async getMatchPlayers(real_matchkey) {
    try {
      const response = await axios.get(
        `http://rest.entitysport.com/v2/matches/${real_matchkey}/squads?token=1&token=5a59a52147983277808ffc8ee228c2bd`
        // `http://rest.entitysport.com/v2/matches/${real_matchkey}/squads?token=1&token=821f15eab2512c06f0fb2cc9c26f47f7`
      );
      // const response = await axios.get(`http://139.59.85.218/entityinfo/getmatchplayersdata/${real_matchkey}`);

      return response.data.response;
    } catch (error) {
      throw error;
    }
  }

  async getMatchScore(real_matchkey) {
    try {
      const response = await axios.get(
        `http://rest.entitysport.com/v2/matches/${real_matchkey}/scorecard?token=1&token=5a59a52147983277808ffc8ee228c2bd`
        // `http://rest.entitysport.com/v2/matches/${real_matchkey}/scorecard?token=1&token=821f15eab2512c06f0fb2cc9c26f47f7`
      );
      // const response = await axios.get(`http://139.59.85.218/entityinfo/getmatchescoredata/${real_matchkey}`);
      return response.data.response;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new entityApiController();
